import { NextRequest } from "next/server";
import { resolveUserIdOrCreateGuest } from "@/lib/whopAuth";
import { getDb } from "@/lib/db";
import crypto from "crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { canUserCreateJob, incrementMonthlyUsage } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await resolveUserIdOrCreateGuest();

  const { filename, contentType } = await req.json().catch(() => ({}));
  if (!filename || !contentType) return Response.json({ error: "filename and contentType required" }, { status: 400 });

  // Enforce plan quota before allowing presign
  const gate = await canUserCreateJob(userId);
  if (!gate.allowed) {
    return Response.json({
      error: "quota_exceeded",
      message: "Your monthly quota has been reached. Upgrade to continue.",
      entitlements: gate.entitlements,
      usage: gate.usage,
    }, { status: 402 });
  }

  const bucket = process.env.AWS_S3_BUCKET as string;
  const region = process.env.AWS_REGION as string;
  if (!bucket || !region) return Response.json({ error: "S3 not configured" }, { status: 500 });

  const s3 = new S3Client({ region, credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  }});

  const jobId = crypto.randomUUID();
  const datePrefix = new Date().toISOString().slice(0,10);
  const key = `uploads/${userId}/${datePrefix}/${jobId}-${filename}`;

  const policy = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["starts-with", "$Content-Type", ""],
      ["eq", "$success_action_status", "201"],
      ["content-length-range", 0, 524288000] // 500MB
    ],
    Fields: {
      "Content-Type": contentType,
      "success_action_status": "201",
    },
    Expires: 3600,
  });

  // Allow CORS from the app at the presign response level (frontend still needs bucket CORS)
  const response = { ok: true, jobId, upload: policy } as const;
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
  
  // Note: job is created after presign so we return presign faster
  // fire-and-forget DB writes
  try {
    const db = getDb();
    await db.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, username: null, avatarUrl: null } });
    await db.job.create({ data: { id: jobId, userId, inputFilename: key, status: "queued", metaJson: JSON.stringify({ storage: "s3", bucket, key }) } });
    await incrementMonthlyUsage(userId, 1);
  } catch (e) {
    console.error("[uploads/init] db error", e);
  }
}
