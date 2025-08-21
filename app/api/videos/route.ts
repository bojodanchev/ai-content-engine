import { NextRequest } from "next/server";
import { getVerifiedWhopUser } from "@/lib/whopAuth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const verified = await getVerifiedWhopUser();
  const userId = String(verified?.userId || "").trim();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getDb();
    const jobs = await db.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, inputFilename: true, outputFilename: true, status: true, metaJson: true, createdAt: true, updatedAt: true }
    });
    const body = JSON.stringify({ jobs });
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (e: any) {
    const body = JSON.stringify({ error: e?.message || "db_error" });
    return new Response(body, { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
}


