import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { url, origin, headers = ["content-type"] } = await req.json();
    if (!url) return Response.json({ error: "url required" }, { status: 400 });

    // Strip query to simulate preflight target URL
    const u = new URL(url);
    const preflightUrl = `${u.origin}${u.pathname}`;

    const res = await fetch(preflightUrl, {
      method: "OPTIONS",
      headers: {
        Origin: origin || "https://example.com",
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": Array.isArray(headers) ? headers.join(",") : String(headers || "content-type"),
      },
    });

    const hdrs: Record<string, string> = {};
    res.headers.forEach((v, k) => { hdrs[k.toLowerCase()] = v; });
    const text = await res.text().catch(() => "");

    return Response.json({ ok: true, status: res.status, headers: hdrs, body: text.slice(0, 500) });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
