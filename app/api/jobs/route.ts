import { NextRequest } from "next/server";
import { resolveUserIdOrCreateGuest } from "@/lib/whopAuth";
import { getDb } from "@/lib/db";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getActivePlanForUser } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/jobs - List user's jobs
export async function GET(req: NextRequest) {
  const effectiveUserId = String(await resolveUserIdOrCreateGuest()).trim();

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

// POST /api/jobs - Enqueue processing job (or inline when WORKER_MODE=inline)
export async function POST(req: NextRequest) {
  const effectiveUserId = String(await resolveUserIdOrCreateGuest()).trim();

  try {
    const { jobId, preset = "default" } = await req.json();
    if (!jobId) return Response.json({ error: "jobId required" }, { status: 400 });

    const db = getDb();
    const job = await db.job.findFirst({ where: { id: jobId, userId: effectiveUserId } });
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    const inline = process.env.WORKER_MODE === "inline";

    // Determine priority based on plan
    const entitlements = await getActivePlanForUser(effectiveUserId);

    if (inline) {
      // Process immediately (temporary fallback until Fargate worker is live)
      try {
        await db.job.update({ where: { id: jobId }, data: { status: "processing" } });
        const { runFfmpegWithMetadata, extractMetadata } = await import("@/lib/video");
        console.log("[inline] envPaths", { FFMPEG_PATH: process.env.FFMPEG_PATH, FFPROBE_PATH: process.env.FFPROBE_PATH });
        const path = await import("path");
        const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
        const { default: streamToBuffer } = await import("@/lib/streamsToBuffer").catch(() => ({ default: null as any }));
        const fs = await import("fs");
        const os = await import("os");

        // Download from S3 to /tmp then run processing
        const bucket = process.env.AWS_S3_BUCKET as string;
        const region = process.env.AWS_REGION as string;
        const s3 = new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string } });
        const key = job.inputFilename;
        const tmpDir = os.tmpdir();
        const inputPath = path.join(tmpDir, `${jobId}-${path.basename(key)}`);
        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bodyStream: any = obj.Body;
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          bodyStream.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
          bodyStream.on("end", () => resolve());
          bodyStream.on("error", reject);
        });
        fs.writeFileSync(inputPath, Buffer.concat(chunks));

        const beforeMeta = await extractMetadata(inputPath).catch(() => null);
        const { outputPath } = await runFfmpegWithMetadata(inputPath, {
          title: `AI Content Engine Export - ${new Date().toISOString()}`,
          comment: `job_id=${jobId}`,
          creation_time: new Date().toISOString()
        }, { transformProfile: entitlements.plan === "FREE" ? "subtle" : "subtle" });
        const afterMeta = await extractMetadata(outputPath).catch(() => null);

        await db.job.update({ where: { id: jobId }, data: { status: "completed", outputFilename: path.basename(outputPath), metaJson: JSON.stringify({ before: beforeMeta, after: afterMeta, preset, priority: entitlements.features.priorityProcessing }), updatedAt: new Date() } });
        return Response.json({ ok: true, completed: true });
      } catch (e: any) {
        const errObj = {
          message: e?.message || String(e),
          exitCode: e?.exitCode ?? null,
          stderr: e?.stderr ?? null,
          stdout: e?.stdout ?? null,
          bin: e?.bin ?? null,
          args: Array.isArray(e?.args) ? e.args : null,
        } as const;
        await db.job.update({ where: { id: jobId }, data: { status: "failed", metaJson: JSON.stringify({ error: errObj }), updatedAt: new Date() } });
        return Response.json({ ok: false, error: "ffmpeg_failed", ...errObj }, { status: 500 });
      }
    }

    // Enqueue to SQS (default)
    await db.job.update({ where: { id: jobId }, data: { status: "queued" } });

    const region = process.env.AWS_REGION as string;
    const queueUrl = process.env.AWS_SQS_QUEUE_URL as string;
    if (!region || !queueUrl) return Response.json({ error: "SQS not configured" }, { status: 500 });

    const sqs = new SQSClient({ region, credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }});

    const payload = { jobId, userId: effectiveUserId, bucket: process.env.AWS_S3_BUCKET, key: job.inputFilename, preset, priority: entitlements.features.priorityProcessing };
    await sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(payload) }));

    return Response.json({ ok: true, enqueued: true });
  } catch (e) {
    console.error("[jobs] POST error", e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
