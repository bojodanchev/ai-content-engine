import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const sessionId = cookies().get("ace_session_id")?.value;
  const sessionUser = sessionId ? getSessionUser(sessionId) : null;
  const fallbackUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  const userId = String((sessionUser?.userId || fallbackUserId || "")).trim();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getDb();
    const jobs = await db.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, inputFilename: true, outputFilename: true, status: true, metaJson: true, createdAt: true, updatedAt: true }
    });
    return Response.json({ jobs });
  } catch (e: any) {
    return Response.json({ error: e?.message || "db_error" }, { status: 500 });
  }
}


