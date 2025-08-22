import { NextRequest } from "next/server";
import { resolveUserIdOrCreateGuest } from "@/lib/whopAuth";
import { getDb } from "@/lib/db";
import { canUserCreateJob, incrementMonthlyUsage } from "@/lib/billing";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = String(await resolveUserIdOrCreateGuest()).trim();

  const { filename, contentType } = await req.json().catch(() => ({}));
  if (!filename || !contentType) return Response.json({ error: "filename and contentType required" }, { status: 400 });

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
  const safeFilename = filename.replace(/\s+/g, "_");
  const key = `uploads/${userId}/${datePrefix}/${jobId}-${safeFilename}`;

  const putCmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ACL: "bucket-owner-full-control" as any });
  const url = await getSignedUrl(s3, putCmd, { expiresIn: 3600 });

  const db = getDb();
  await db.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, username: null, avatarUrl: null } });
  await db.job.create({ data: { id: jobId, userId, inputFilename: key, status: "queued", metaJson: JSON.stringify({ storage: "s3", bucket, key }) } });
  await incrementMonthlyUsage(userId, 1);

  return Response.json({ ok: true, jobId, url, bucket, key });
}
