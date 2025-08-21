import { NextRequest } from "next/server";
import { getVerifiedWhopUser } from "@/lib/whopAuth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/jobs/[id] - Get specific job details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const verified = await getVerifiedWhopUser();
  const effectiveUserId = verified?.userId || null;
  
  if (!effectiveUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = params.id;
  if (!jobId) {
    return Response.json({ error: "Job ID required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const job = await db.job.findUnique({
      where: { 
        id: jobId, 
        userId: effectiveUserId 
      }
    });

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    return Response.json({ job });
  } catch (e) {
    console.error("[jobs/[id]] GET error", e);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
