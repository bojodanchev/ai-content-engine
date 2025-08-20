import { NextRequest } from "next/server";
import { generateUploadURL } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name, contentType } = await req.json();
    if (!name) return Response.json({ error: "missing name" }, { status: 400 });
    const ct = contentType || "application/octet-stream";
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    if (!token) return Response.json({ error: "missing blob token" }, { status: 500 });
    const pathname = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`;
    const { url } = await generateUploadURL({ access: "public", contentType: ct, token, pathname });
    return Response.json({ url });
  } catch (e: any) {
    console.error("/api/blob-url error", e);
    return Response.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}


