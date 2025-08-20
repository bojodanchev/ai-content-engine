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
      // 1) Ask server for presigned S3 POST + jobId
      const initRes = await fetch("/api/uploads/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" })
      });
      if (!initRes.ok) {
        let msg = `Init failed (${initRes.status})`;
        try { const j = await initRes.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const { jobId: jid, upload } = await initRes.json();
      if (!upload?.url || !upload?.fields) throw new Error("Invalid upload init response");

      // 2) POST directly to S3 (multipart/form-data with policy fields)
      const form = new FormData();
      Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v as string));
      form.append("Content-Type", file.type || "application/octet-stream");
      form.append("file", file);
      const s3Res = await fetch(upload.url, { method: "POST", body: form, mode: "cors" as any });
      if (!s3Res.ok && s3Res.status !== 201) {
        let body = "";
        try { body = await s3Res.text(); } catch {}
        throw new Error(`S3 upload failed (${s3Res.status})${body ? `: ${body.slice(0,300)}` : ""}`);
      }
      setJobId(jid);
      setStatus("File uploaded to S3. Ready to process.");
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
          className="w-fit rounded-xl px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold disabled:opacity-50 hover:opacity-90 transition"
        >
          {isUploading ? "Uploading…" : "Upload Video"}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={startProcessing}
            disabled={isProcessing}
            className="w-fit rounded-xl px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-400 text-black font-semibold disabled:opacity-50 hover:opacity-90 transition"
          >
            {isProcessing ? "Processing…" : "Start Processing"}
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


