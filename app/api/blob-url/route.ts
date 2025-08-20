import { NextRequest } from "next/server";
import { generateUploadURL } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { name, contentType } = await req.json();
  if (!name || !contentType) return new Response("Bad request", { status: 400 });
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response("Missing blob token", { status: 500 });
  const { url } = await generateUploadURL({ access: "private", contentType, token });
  return Response.json({ url });
}


