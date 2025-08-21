import "server-only";
// Resolve ffmpeg/ffprobe at runtime to avoid bundler rewriting paths
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegStatic = require("ffmpeg-static");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeStatic = require("ffprobe-static");
import { spawn } from "node:child_process";
import path from "path";
import fs from "fs";

// Configure ffmpeg/ffprobe paths with fallbacks for serverless environments
// Prefer library-resolved binary paths; fall back to env only if necessary
// Resolve paths robustly: pick the first existing candidate
function pickExistingPath(candidates: (string | undefined)[]): string {
  for (const p of candidates) {
    if (!p) continue;
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return candidates.find(Boolean) as string;
}

let resolvedFfmpeg = pickExistingPath([
  process.env.FFMPEG_PATH,
  (ffmpegStatic as unknown as string),
  "/var/task/node_modules/ffmpeg-static/ffmpeg",
  "/usr/bin/ffmpeg",
  "ffmpeg",
]);
let resolvedFfprobe = pickExistingPath([
  process.env.FFPROBE_PATH,
  (ffprobeStatic?.path as string),
  "/var/task/node_modules/ffprobe-static/bin/linux/x64/ffprobe",
  "/usr/bin/ffprobe",
  "ffprobe",
]);

// If resolver yields a Next chunk path, rewrite to package path
if (resolvedFfmpeg.includes(".next/server/chunks")) {
  resolvedFfmpeg = "/var/task/node_modules/ffmpeg-static/ffmpeg";
}
if (resolvedFfprobe.includes(".next/server/chunks")) {
  resolvedFfprobe = "/var/task/node_modules/ffprobe-static/bin/linux/x64/ffprobe";
}
// fluent-ffmpeg removed; we will spawn binaries directly
try {
  const ff = resolvedFfmpeg;
  const fp = resolvedFfprobe;
  const ffExists = fs.existsSync(ff);
  const fpExists = fs.existsSync(fp);
  if (ffExists) {
    try { fs.chmodSync(ff, 0o755); } catch {}
  }
  if (fpExists) {
    try { fs.chmodSync(fp, 0o755); } catch {}
  }
  console.log("[ffmpeg] resolved", { ff, ffExists, fp, fpExists });
} catch {}

export async function extractMetadata(filePath: string): Promise<Record<string, any>> {
  const args = ["-v", "error", "-show_format", "-show_streams", "-print_format", "json", filePath];
  const res = await run(resolvedFfprobe, args);
  try { return JSON.parse(res.stdout || "{}"); } catch { return {}; }
}

type MetaOverrides = {
  title?: string;
  comment?: string;
  creation_time?: string;
};

export async function runFfmpegWithMetadata(inputPath: string, overrides: MetaOverrides) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const ext = path.extname(inputPath).toLowerCase();
  const container: "mp4" | "mov" | "webm" = ext === ".webm" ? "webm" : ext === ".mov" ? "mov" : "mp4";
  const outputPath = path.join(dir, `${base}_processed${ext || ".mp4"}`);
  const metaArgsBase = [
    "-y", "-i", inputPath,
    "-map", "0",
    "-c", "copy",
    "-map_metadata", "-1",
    "-metadata", `title=${overrides.title ?? "AI Content Engine export"}`,
    "-metadata", `comment=${overrides.comment ?? `job_id=${Date.now()}`}`,
    "-metadata", `creation_time=${overrides.creation_time ?? new Date().toISOString()}`,
  ];
  const copyArgs = container === "webm" ? [...metaArgsBase, outputPath] : [...metaArgsBase, "-movflags", "use_metadata_tags+faststart", outputPath];
  try {
    await run(resolvedFfmpeg, copyArgs);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) return { outputPath };
  } catch (e) {
    console.log("[ffmpeg] copy failed, will transcode", (e as any)?.message || e);
  }
  const transcodeArgs = [
    "-y", "-i", inputPath,
    "-map_metadata", "-1",
    "-metadata", `title=${overrides.title ?? "AI Content Engine export"}`,
    "-metadata", `comment=${overrides.comment ?? `job_id=${Date.now()}`}`,
    "-metadata", `creation_time=${overrides.creation_time ?? new Date().toISOString()}`,
    ...(container === "webm" ? [] : ["-movflags", "use_metadata_tags+faststart"]),
    "-pix_fmt", "yuv420p",
    "-c:v", "libx264",
    "-c:a", "aac",
    outputPath,
  ];
  await run(resolvedFfmpeg, transcodeArgs);
  return { outputPath };
}

class ExecError extends Error {
  exitCode: number | null;
  stderr: string;
  stdout: string;
  bin: string;
  args: string[];
  constructor(message: string, opts: { exitCode: number | null; stderr: string; stdout: string; bin: string; args: string[] }) {
    super(message);
    this.name = "ExecError";
    this.exitCode = opts.exitCode;
    this.stderr = opts.stderr;
    this.stdout = opts.stdout;
    this.bin = opts.bin;
    this.args = opts.args;
  }
}

async function run(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  const attempt = (b: string): Promise<{ stdout: string; stderr: string }> => new Promise((resolve, reject) => {
    const child = spawn(b, args);
    let stdout = ""; let stderr = "";
    child.stdout?.on("data", d => stdout += String(d));
    child.stderr?.on("data", d => stderr += String(d));
    child.on("error", (err: any) => reject(new ExecError(err?.message || "spawn error", { exitCode: null, stderr, stdout, bin: b, args })));
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new ExecError(stderr || `exit ${code}`, { exitCode: code ?? null, stderr, stdout, bin: b, args }));
    });
  });

  try {
    return await attempt(bin);
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    if (msg.includes("ENOENT") && bin !== "ffmpeg" && bin !== "ffprobe") {
      // Retry with PATH-resolved binary name as last resort
      const fallback = args.includes("-show_format") ? "ffprobe" : "ffmpeg";
      return await attempt(fallback);
    }
    throw e;
  }
}


