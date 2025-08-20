import { NextRequest } from "next/server";

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

    const resp = await fetch("https://api.vercel.com/v2/blob/generate-upload-url", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access: "public", contentType: ct, pathname }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return Response.json({ error: `blob api ${resp.status}: ${txt || "failed"}` }, { status: 500 });
    }
    const data: any = await resp.json();
    const signedUrl = data.url || data.uploadUrl;
    if (!signedUrl) return Response.json({ error: "no url in blob response" }, { status: 500 });
    return Response.json({ url: signedUrl });
  } catch (e: any) {
    console.error("/api/blob-url error", e);
    return Response.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}


