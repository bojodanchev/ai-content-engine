import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import Link from "next/link";

export default function DashboardPage() {
  const sessionId = cookies().get("ace_session_id")?.value;
  const sessionUser = sessionId ? getSessionUser(sessionId) : null;

  const effectiveUserId = sessionUser?.userId || process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || "anonymous";

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Upload & Process</h1>
      <p className="text-white/70 mt-2">Upload a video to extract and modify metadata. Your processed files will appear below.</p>
      <form className="mt-6" action="/api/upload" method="post" encType="multipart/form-data">
        <input type="file" name="file" accept="video/*" className="block text-sm" required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-white/70">Title</span>
            <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" name="title" placeholder="Optional override" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-white/70">Comment</span>
            <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" name="comment" placeholder="Optional" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-white/70">Creation time</span>
            <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2" name="creation_time" placeholder="ISO 8601 or leave blank" />
          </label>
        </div>
        <button className="mt-4 rounded-xl px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold hover:opacity-90 transition">Upload & Process</button>
      </form>

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


