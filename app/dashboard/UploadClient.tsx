"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
// no client helper; use pre-signed PUT URLs only

export default function UploadClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  // metadata fields are auto-generated server-side for best UX
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const submit = async () => {
    setError(null);
    if (!file) {
      setError("Select a video first");
      return;
    }
    setIsSubmitting(true);
    try {
      // Pre-signed URL flow only
      const pre = await fetch("/api/blob-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, contentType: file.type || "application/octet-stream" })
      });
      if (!pre.ok) throw new Error("Failed to init upload");
      const { url } = await pre.json();
      const put = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!put.ok) throw new Error("Direct upload failed");
      const blobUrl = put.headers.get("location") || url;

      // 3) Ask server to process from blob URL
      const res = await fetch("/api/process-from-blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl })
      });
      if (!res.ok) throw new Error(`Processing failed (${res.status})`);
      // Refresh Jobs list
      router.refresh();
      setFile(null);
      // metadata is auto-set server-side; nothing to reset
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div
        className={`rounded-2xl border ${isDragging ? "border-fuchsia-400/50 bg-white/10" : "border-white/10 bg-white/[0.04]"} p-6`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
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

      {/* metadata inputs removed; handled automatically on server */}

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        onClick={submit}
        disabled={!file || isSubmitting}
        className="w-fit rounded-xl px-4 py-2.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 text-black font-semibold disabled:opacity-50 hover:opacity-90 transition"
      >
        {isSubmitting ? "Processing…" : "Generate Unique Metadata"}
      </button>
    </div>
  );
}


