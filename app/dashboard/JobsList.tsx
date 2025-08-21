import { getDb } from "@/lib/db";

interface JobsListProps {
  userId: string;
}

export default async function JobsList({ userId }: JobsListProps) {
  const db = getDb();
  let jobs: any[] = [];
  
  try {
    const result = await db.job.findMany({
      where: { userId },
      select: { 
        id: true, 
        inputFilename: true, 
        outputFilename: true, 
        status: true, 
        createdAt: true,
        updatedAt: true,
        metaJson: true
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    jobs = Array.isArray(result) ? result : [];
  } catch (e) {
    console.error("Failed to fetch jobs:", e);
    jobs = [];
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400 bg-green-400/10";
      case "processing": return "text-yellow-400 bg-yellow-400/10";
      case "failed": return "text-red-400 bg-red-400/10";
      case "queued": return "text-blue-400 bg-blue-400/10";
      default: return "text-white/60 bg-white/5";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "✅";
      case "processing": return "⏳";
      case "failed": return "❌";
      case "queued": return "⏸️";
      default: return "❓";
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const getOriginalName = (metaJson: string | null) => {
    if (!metaJson) return "Unknown";
    try {
      const meta = JSON.parse(metaJson);
      return meta.originalName || "Unknown";
    } catch {
      return "Unknown";
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-white/60">
        <p>No jobs yet. Upload a video to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getStatusIcon(job.status)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
              
              <div className="text-sm">
                <div className="font-medium text-white/90 mb-1">
                  {getOriginalName(job.metaJson)}
                </div>
                <div className="text-white/60 text-xs">
                  Created: {formatDate(job.createdAt)}
                </div>
                {job.updatedAt && job.updatedAt !== job.createdAt && (
                  <div className="text-white/60 text-xs">
                    Updated: {formatDate(job.updatedAt)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {job.status === "completed" && (
                <a 
                  href={`/api/download/processed/${encodeURIComponent(job.id)}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black text-sm font-medium rounded-lg transition"
                >
                  📥 Download
                </a>
              )}
              
              {job.status === "failed" && (
                <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                  Processing failed
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
