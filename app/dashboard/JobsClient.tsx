"use client";
import { useEffect, useState } from "react";

type Job = {
  id: string;
  inputFilename: string | null;
  outputFilename: string | null;
  status: string;
  metaJson: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const data = await res.json();
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
    const t = setInterval(fetchJobs, 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="text-white/60 text-sm">Loading jobs…</div>;
  if (jobs.length === 0) return <div className="text-white/60 text-sm">No jobs yet. Upload a video to get started.</div>;

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium text-white/90">{job.inputFilename?.split("/").pop() || job.id}</div>
            <div className="text-white/60 text-xs">{job.status}</div>
          </div>
          {job.status === "completed" && (
            <a href={`/api/download/processed/${encodeURIComponent(job.id)}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black text-sm font-medium rounded-lg transition">📥 Download</a>
          )}
        </div>
      ))}
    </div>
  );
}


