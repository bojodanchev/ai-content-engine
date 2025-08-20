import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { runFfmpegWithMetadata, extractMetadata } from "@/lib/video";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // allow longer ffmpeg runs on Vercel

export async function POST(req: NextRequest) {
  const sessionId = cookies().get("ace_session_id")?.value;
  const sessionUser = sessionId ? getSessionUser(sessionId) : null;
  const fallbackUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  const effectiveUserId = sessionUser?.userId || fallbackUserId;
  if (!effectiveUserId) return new Response("Unauthorized", { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    console.error("[upload] formData parse failed", e);
    return new Response("Bad form data", { status: 400 });
  }
  const file = formData.get("file") as File | null;
  if (!file) return new Response("File missing", { status: 400 });

  const title = (formData.get("title") as string) || undefined;
  const comment = (formData.get("comment") as string) || undefined;
  const creation_time = (formData.get("creation_time") as string) || undefined;

  const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/ace-storage" : path.join(process.cwd(), "var", "storage"));
  fs.mkdirSync(dataDir, { recursive: true });

  const inputId = crypto.randomUUID();
  const inputPath = path.join(dataDir, `${inputId}_${file.name}`);
  const arrayBuffer = await file.arrayBuffer();
  try {
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));
  } catch (e) {
    console.error("[upload] write file failed", e);
    return new Response("Write failed", { status: 500 });
  }

  const jobId = crypto.randomUUID();
  const db = getDb();
  const beforeMeta = await extractMetadata(inputPath).catch(() => null);
  db.prepare("INSERT INTO jobs (id, user_id, input_filename, status, meta_json) VALUES (?, ?, ?, ?, ?)").run(
    jobId,
    effectiveUserId,
    path.basename(inputPath),
    "queued",
    JSON.stringify({ before: beforeMeta })
  );

  // Process synchronously for now for simplicity
  try {
    const { outputPath } = await runFfmpegWithMetadata(inputPath, {
      title,
      comment,
      creation_time,
    });
    const afterMeta = await extractMetadata(outputPath).catch(() => null);
    db.prepare("UPDATE jobs SET status=?, output_filename=?, updated_at=datetime('now'), meta_json=? WHERE id=?").run(
      "completed",
      path.basename(outputPath),
      JSON.stringify({ before: beforeMeta, after: afterMeta }),
      jobId
    );
  } catch (e) {
    console.error("[upload] ffmpeg failed", e);
    db.prepare("UPDATE jobs SET status=?, updated_at=datetime('now') WHERE id=?").run("failed", jobId);
    if (req.headers.get("x-requested-with") === "XMLHttpRequest") {
      return Response.json({ ok: false, error: "ffmpeg_failed" }, { status: 500 });
    }
    return new Response("Processing failed", { status: 500 });
  }
  if (req.headers.get("x-requested-with") === "XMLHttpRequest") {
    return Response.json({ ok: true });
  }
  return Response.redirect(`/dashboard`);
}


