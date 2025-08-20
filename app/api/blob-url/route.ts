import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name, contentType } = await req.json();
    if (!name) return Response.json({ error: "missing name" }, { status: 400 });
    const ct = contentType || "application/octet-stream";
    return Response.json({ error: "blob disabled" }, { status: 404 });
  } catch (e: any) {
    console.error("/api/blob-url error", e);
    return Response.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}


