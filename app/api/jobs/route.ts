import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/jobs - List user's jobs
export async function GET(req: NextRequest) {
  const sessionId = cookies().get("ace_session_id")?.value;
  const sessionUser = sessionId ? getSessionUser(sessionId) : null;
  const fallbackUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  const effectiveUserId = sessionUser?.userId || fallbackUserId;
  
  if (!effectiveUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const jobs = await db.job.findMany({
      where: { userId: effectiveUserId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return Response.json({ jobs });
  } catch (e) {
    console.error("[jobs] GET error", e);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

// POST /api/jobs - Enqueue processing job
export async function POST(req: NextRequest) {
  const sessionId = cookies().get("ace_session_id")?.value;
  const sessionUser = sessionId ? getSessionUser(sessionId) : null;
  const fallbackUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  const effectiveUserId = sessionUser?.userId || fallbackUserId;
  
  if (!effectiveUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, preset = "default" } = await req.json();
    if (!jobId) return Response.json({ error: "jobId required" }, { status: 400 });

    const db = getDb();
    const job = await db.job.findUnique({ where: { id: jobId, userId: effectiveUserId } });
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    await db.job.update({ where: { id: jobId }, data: { status: "queued" } });

    const region = process.env.AWS_REGION as string;
    const queueUrl = process.env.AWS_SQS_QUEUE_URL as string;
    if (!region || !queueUrl) return Response.json({ error: "SQS not configured" }, { status: 500 });

    const sqs = new SQSClient({ region, credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }});

    const payload = { jobId, userId: effectiveUserId, bucket: process.env.AWS_S3_BUCKET, key: job.inputFilename, preset };
    await sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(payload) }));

    return Response.json({ ok: true, enqueued: true });
  } catch (e) {
    console.error("[jobs] POST error", e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
