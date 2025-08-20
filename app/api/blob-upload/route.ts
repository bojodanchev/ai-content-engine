import { handleUpload } from "@vercel/blob/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "missing blob token" }), { status: 500 });
  }

  const result = await handleUpload({
    request,
    token,
    onBeforeGenerateToken: async (pathname) => {
      return {
        access: "public",
        allowedContentTypes: ["video/*", "application/octet-stream"],
        pathname: `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${pathname}`,
      } as const;
    },
    onUploadCompleted: async () => {
      // no-op; processing happens in /api/process-from-blob after client has blob URL
    },
  });

  return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
}
// cleaned duplicates


