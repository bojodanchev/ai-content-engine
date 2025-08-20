import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

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
      take: 50 // Limit to recent jobs
    });

    return Response.json({ jobs });
  } catch (e) {
    console.error("[jobs] GET error", e);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

// POST /api/jobs - Create a new job (trigger processing)
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
    
    if (!jobId) {
      return Response.json({ error: "jobId required" }, { status: 400 });
    }

    const db = getDb();
    
    // Get the job
    const job = await db.job.findUnique({
      where: { id: jobId, userId: effectiveUserId }
    });

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "queued") {
      return Response.json({ error: "Job already processed" }, { status: 400 });
    }

    // Update job status to processing
    await db.job.update({
      where: { id: jobId },
      data: { status: "processing" }
    });

    // Start background processing (for now, in-process)
    try {
      const { runFfmpegWithMetadata, extractMetadata } = await import("@/lib/video");
      const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/ace-storage" : path.join(process.cwd(), "var", "storage"));
      const inputPath = path.join(dataDir, job.inputFilename);

      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found at ${inputPath}`);
      }

      // Extract original metadata
      const beforeMeta = await extractMetadata(inputPath).catch(() => null);
      
      // Process with FFmpeg
      const { outputPath } = await runFfmpegWithMetadata(inputPath, {
        title: `AI Content Engine Export - ${new Date().toISOString()}`,
        comment: `job_id=${jobId}`,
        creation_time: new Date().toISOString()
      });

      // Extract processed metadata
      const afterMeta = await extractMetadata(outputPath).catch(() => null);
      
      // Update job as completed
      await db.job.update({
        where: { id: jobId },
        data: {
          status: "completed",
          outputFilename: path.basename(outputPath),
          metaJson: JSON.stringify({
            before: beforeMeta,
            after: afterMeta,
            preset,
            processedAt: new Date().toISOString()
          }),
          updatedAt: new Date()
        }
      });

      return Response.json({ 
        ok: true, 
        message: "Processing completed successfully",
        jobId 
      });

    } catch (e) {
      console.error("[jobs] processing error", e);
      
      // Update job as failed
      await db.job.update({
        where: { id: jobId },
        data: {
          status: "failed",
          metaJson: JSON.stringify({
            error: e instanceof Error ? e.message : String(e),
            failedAt: new Date().toISOString()
          }),
          updatedAt: new Date()
        }
      });

      return Response.json({ 
        ok: false, 
        error: "Processing failed",
        details: e instanceof Error ? e.message : String(e)
      }, { status: 500 });
    }

  } catch (e) {
    console.error("[jobs] POST error", e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
