import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { extractMetadata, runFfmpegWithMetadata } from "@/lib/video";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
export const sizeLimit = "50mb";
export const preferredRegion = ["iad1", "cle1", "sfo1"];

export async function POST(req: NextRequest) {
  try {
    const sessionId = cookies().get("ace_session_id")?.value;
    const sessionUser = sessionId ? getSessionUser(sessionId) : null;
    const fallbackUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || "anonymous";
    const userId = sessionUser?.userId || fallbackUserId;
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return new Response("File missing", { status: 400 });

    const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/ace-storage" : path.join(process.cwd(), "var", "storage"));
    fs.mkdirSync(dataDir, { recursive: true });

    const inputId = crypto.randomUUID();
    const inputPath = path.join(dataDir, `${inputId}_${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    const db = getDb();
    const jobId = crypto.randomUUID();
    const beforeMeta = await extractMetadata(inputPath).catch(() => null);
    await db.job.create({ data: { id: jobId, userId, inputFilename: path.basename(inputPath), status: "queued", metaJson: JSON.stringify({ before: beforeMeta }) } });

    try {
      const { outputPath } = await runFfmpegWithMetadata(inputPath, {
        title: `Post ${new Date().toISOString()}`,
        comment: "Processed by AI Content Engine",
        creation_time: new Date().toISOString(),
      });
      const afterMeta = await extractMetadata(outputPath).catch(() => null);
      await db.job.update({ where: { id: jobId }, data: { status: "completed", outputFilename: path.basename(outputPath), metaJson: JSON.stringify({ before: beforeMeta, after: afterMeta }), updatedAt: new Date() } });
    } catch (e) {
      console.error("[upload-direct] ffmpeg failed", e);
      await db.job.update({ where: { id: jobId }, data: { status: "failed", updatedAt: new Date() } });
      if (req.headers.get("x-requested-with") === "XMLHttpRequest") {
        return Response.json({ ok: false, error: "ffmpeg_failed" }, { status: 500 });
      }
      return new Response("Processing failed", { status: 500 });
    }

    if (req.headers.get("x-requested-with") === "XMLHttpRequest") {
      return Response.json({ ok: true });
    }
    return Response.redirect(`/dashboard`);
  } catch (e: any) {
    console.error("[upload-direct] error", e);
    return new Response("Server error", { status: 500 });
  }
}


