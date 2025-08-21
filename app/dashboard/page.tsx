import { getSessionUser } from "@/lib/session";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import UploadClient from "./UploadClient";
import JobsClient from "./JobsClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionId = cookies().get("ace_session_id")?.value;
  const sessionUser = sessionId ? getSessionUser(sessionId) : null;
  const fallbackUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  const effectiveUserId = sessionUser?.userId || fallbackUserId;

  if (!effectiveUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p>Please sign in to access the dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Content Engine</h1>
          <p className="text-white/70">Transform your videos with unique metadata for social media</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload & Process</h2>
            <UploadClient />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Jobs</h2>
            {/* Use client poller only to avoid stale SSR snapshots */}
            <JobsClient />
          </div>
        </div>
      </div>
    </div>
  );
}


