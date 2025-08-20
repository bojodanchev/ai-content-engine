import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });
  const db = getDb();
  const row = db.prepare("SELECT output_filename FROM jobs WHERE id=?").get(id) as any;
  if (!row?.output_filename) return new Response("Not found", { status: 404 });
  const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/ace-storage" : path.join(process.cwd(), "var", "storage"));
  const filePath = path.join(dataDir, row.output_filename);
  if (!fs.existsSync(filePath)) return new Response("File missing", { status: 404 });
  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const safeName = row.output_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return new Response(stream as any, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${safeName}"` ,
    },
  });
}


