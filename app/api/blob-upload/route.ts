import type { NextRequest } from "next/server";
import { handleUpload } from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("/api/blob-upload missing token env");
    return new Response(JSON.stringify({ error: "missing blob token" }), { status: 500 });
  }

  return handleUpload(req, {
    onBeforeGenerateToken: async (pathname, _clientPayload) => {
      const cfg = {
        token,
        access: "public",
        allowedContentTypes: ["video/*", "application/octet-stream"],
        pathname: `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${pathname}`,
      } as const;
      return cfg;
    },
    onUploadCompleted: async () => {
      // no-op; processing happens in /api/process-from-blob
    },
  });
}


