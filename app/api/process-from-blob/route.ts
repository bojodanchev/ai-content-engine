import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { extractMetadata, runFfmpegWithMetadata } from "@/lib/video";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { blobUrl, title, comment, creation_time } = await req.json();
  if (!blobUrl) return new Response("Missing blobUrl", { status: 400 });

  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || "";
  const res = await fetch(blobUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok || !res.body) return new Response("Fetch blob failed", { status: 400 });

  const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/ace-storage" : path.join(process.cwd(), "var", "storage"));
  fs.mkdirSync(dataDir, { recursive: true });
  const inputId = crypto.randomUUID();
  const inputPath = path.join(dataDir, `${inputId}.mp4`);
  const out = fs.createWriteStream(inputPath);
  await new Promise<void>((resolve, reject) => {
    (res.body as any).pipe(out);
    out.on("finish", () => resolve());
    out.on("error", reject);
  });

  const jobId = crypto.randomUUID();
  const db = getDb();
  const beforeMeta = await extractMetadata(inputPath).catch(() => null);
  db.prepare("INSERT INTO jobs (id, user_id, input_filename, status, meta_json) VALUES (?, ?, ?, ?, ?)").run(
    jobId,
    process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID ?? "anonymous",
    path.basename(inputPath),
    "queued",
    JSON.stringify({ before: beforeMeta })
  );

  try {
    const autoTitle = title || `Post ${new Date().toISOString()}`;
    const autoComment = comment || `Processed by AI Content Engine`;
    const autoCreation = creation_time || new Date().toISOString();
    const { outputPath } = await runFfmpegWithMetadata(inputPath, { title: autoTitle, comment: autoComment, creation_time: autoCreation });
    const afterMeta = await extractMetadata(outputPath).catch(() => null);
    db.prepare("UPDATE jobs SET status=?, output_filename=?, updated_at=datetime('now'), meta_json=? WHERE id=?").run(
      "completed",
      path.basename(outputPath),
      JSON.stringify({ before: beforeMeta, after: afterMeta }),
      jobId
    );
    return Response.json({ ok: true, jobId });
  } catch (e) {
    db.prepare("UPDATE jobs SET status=?, updated_at=datetime('now') WHERE id=?").run("failed", jobId);
    return new Response("Processing failed", { status: 500 });
  }
}


