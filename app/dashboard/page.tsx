import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import Link from "next/link";
import UploadClient from "./UploadClient";

export default function DashboardPage() {
  const sessionId = cookies().get("ace_session_id")?.value;
  const sessionUser = sessionId ? getSessionUser(sessionId) : null;

  const effectiveUserId = sessionUser?.userId || process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || "anonymous";

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Metadata Re‑Generation</h1>
        <Link href="/" className="text-sm underline">Back to Home</Link>
      </div>
      <p className="text-white/70 mt-2">Upload a video to extract and modify metadata. Your processed files will appear below.</p>

      <div className="mt-6">
        <UploadClient />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Recent jobs</h2>
        <JobsList userId={effectiveUserId} />
      </div>
    </div>
  );
}

function JobsList({ userId }: { userId: string }) {
  // This is a server component; read from SQLite directly
  const db = require("@/lib/db");
  const { getDb } = db;
  const rows = getDb()
    .prepare("SELECT id, input_filename, output_filename, status, created_at FROM jobs WHERE user_id=? ORDER BY created_at DESC LIMIT 20")
    .all(userId) as Array<any>;

  return (
    <div className="mt-3 grid gap-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm flex items-center justify-between">
          <div>
            <div className="font-medium">{r.input_filename}</div>
            <div className="text-white/60">{r.status}</div>
          </div>
          {r.output_filename ? (
            <a className="underline" href={`/api/download?id=${encodeURIComponent(r.id)}`}>Download</a>
          ) : null}
        </div>
      ))}
    </div>
  );
}


