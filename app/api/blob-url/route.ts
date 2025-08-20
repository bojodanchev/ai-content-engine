import { NextRequest } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { name, contentType } = await req.json();
  if (!name || !contentType) return new Response("Bad request", { status: 400 });
  const { url } = await put(name, new Blob([""]), { access: "private", contentType, token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN });
  return Response.json({ url });
}


