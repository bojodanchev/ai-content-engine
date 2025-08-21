import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return new Response("Missing id", { status: 400 });
  const db = getDb();
  const job = await db.job.findUnique({ where: { id } }) as any;
  if (!job) return new Response("Not found", { status: 404 });

  const region = process.env.AWS_REGION as string;
  const bucket = process.env.AWS_S3_BUCKET as string;
  if (!region || !bucket) return new Response("storage not configured", { status: 500 });

  const key = job.outputFilename ? `processed/${id}.${(job.outputFilename.split('.').pop() || 'mp4')}` : null;
  // If metaJson contains processedKey, prefer it
  try {
    const meta = job.metaJson ? JSON.parse(job.metaJson) : null;
    if (meta?.processedKey) {
      const s3 = new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string } });
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: meta.processedKey }), { expiresIn: 3600 });
      return Response.redirect(url, 302);
    }
  } catch {}

  if (!key) return new Response("not ready", { status: 409 });
  const s3 = new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string } });
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  return Response.redirect(url, 302);
}


