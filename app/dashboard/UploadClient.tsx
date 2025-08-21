"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function UploadClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [stderrPreview, setStderrPreview] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      e.dataTransfer.clearData();
    }
  }, []);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  }, []);

  const uploadFile = async () => {
    setError(null);
    setStderrPreview(null);
    if (!file) {
      setError("Select a video first");
      return;
    }
    setIsUploading(true);
    try {
      // 1) Ask server for presigned S3 PUT + jobId
      const initRes = await fetch("/api/uploads/put", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" })
      });
      if (!initRes.ok) {
        let msg = `Init failed (${initRes.status})`;
        try { const j = await initRes.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const { jobId: jid, url } = await initRes.json();
      if (!url) throw new Error("Invalid upload init response");

      // 2) PUT directly to S3
      // Preflight diagnostic (server asks S3 OPTIONS and returns headers)
      try {
        const diag = await fetch("/api/debug/s3-cors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, origin: window.location.origin, headers: ["content-type"] }) });
        const info = await diag.json().catch(() => ({}));
        console.log("[S3-CORS-DIAG]", info);
      } catch {}

      const s3Res = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!s3Res.ok) {
        let body = "";
        try { body = await s3Res.text(); } catch {}
        throw new Error(`S3 upload failed (${s3Res.status})${body ? `: ${body.slice(0,300)}` : ""}`);
      }
      setJobId(jid);
      setStatus("File uploaded. Ready to process.");
      console.log("[UPLOAD-INIT]", { jobId: jid, url });
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const startProcessing = async () => {
    if (!jobId) return;
    setIsProcessing(true);
    setError(null);
    setStderrPreview(null);
    try {
      const processRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, preset: "default" })
      });
      if (!processRes.ok) {
        let msg = `Processing failed (${processRes.status})`;
        try {
          const j = await processRes.json();
          if (j?.error) msg = j.error;
          if (j?.stderr) setStderrPreview(String(j.stderr).slice(0, 1000));
        } catch {}
        throw new Error(msg);
      }
      setStatus("Processing completed successfully!");
      setTimeout(() => {
        router.refresh();
        setFile(null);
        setJobId(null);
        setStatus("");
      }, 1500);
    } catch (e: any) {
      setError(e.message ?? "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setJobId(null);
    setStatus("");
    setError(null);
    setStderrPreview(null);
  };

  return (
    <div className="grid gap-4">
      <div
        className={`rounded-2xl border ${isDragging ? "border-fuchsia-400/50 bg-white/10" : "border-white/10 bg-white/[0.04]"} p-6`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div className="text-sm font-semibold">Upload video</div>
        <p className="text-white/70 text-sm mt-1">Drag & drop or click to choose a file. MP4, MOV, WebM.</p>
        <label className="inline-block mt-4 rounded-xl px-4 py-2.5 border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer">
          <input type="file" accept="video/*" className="hidden" onChange={onPick} />
          Choose file
        </label>
        {file && (
          <div className="mt-3 text-sm text-white/80">
            Selected: <span className="font-medium">{file.name}</span> ({Math.round(file.size/1024/1024)} MB)
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {stderrPreview && (
        <pre className="text-xs whitespace-pre-wrap text-white/70 bg-white/5 p-3 rounded-lg max-h-56 overflow-auto">
{stderrPreview}
        </pre>
      )}

      {status && (
        <div className="text-sm text-green-400 bg-green-400/10 p-3 rounded-lg">
          {status}
        </div>
      )}

      {!jobId ? (
        <button
          onClick={uploadFile}
          disabled={!file || isUploading}
          className={`w-fit rounded-xl px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold hover:opacity-90 transition ${(!file || isUploading) ? "opacity-50" : ""} ${isUploading ? "animate-pulse" : ""}`}
        >
          {isUploading ? (
            <span className="inline-flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg> Uploading…</span>
          ) : (
            "Upload Video"
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <button
            onClick={startProcessing}
            disabled={isProcessing}
            className={`w-fit rounded-xl px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-400 text-black font-semibold hover:opacity-90 transition ${isProcessing ? "opacity-70 animate-pulse" : ""}`}
          >
            {isProcessing ? (
              <span className="inline-flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg> Processing…</span>
            ) : (
              "Start Processing"
            )}
          </button>
          <button
            onClick={resetForm}
            className="w-fit rounded-xl px-4 py-2.5 border border-white/15 bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}


