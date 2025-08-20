import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = ["iad1", "cle1", "sfo1"];

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

  const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/ace-storage" : path.join(process.cwd(), "var", "storage"));
  fs.mkdirSync(dataDir, { recursive: true });

  const jobId = crypto.randomUUID();
  const inputPath = path.join(dataDir, `${jobId}_input${path.extname(file.name)}`);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));
  } catch (e) {
    console.error("[upload] write file failed", e);
    return new Response("Write failed", { status: 500 });
  }

  // Create job record with status "queued"
  const db = getDb();
  try {
    await db.user.upsert({
      where: { id: effectiveUserId },
      update: {},
      create: { id: effectiveUserId, username: null, avatarUrl: null },
    });
    
    await db.job.create({
      data: {
        id: jobId,
        userId: effectiveUserId,
        inputFilename: path.basename(inputPath),
        status: "queued",
        metaJson: JSON.stringify({ 
          originalName: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        })
      }
    });
  } catch (e) {
    console.error("[upload] database error", e);
    // Clean up file if db insert failed
    try { fs.unlinkSync(inputPath); } catch {}
    return new Response("Database error", { status: 500 });
  }

  // Return jobId for frontend to poll status
  return Response.json({ 
    ok: true, 
    jobId,
    message: "File uploaded successfully. Processing will begin shortly."
  });
}


