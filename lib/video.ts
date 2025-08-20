import "server-only";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

// Configure ffmpeg/ffprobe paths with fallbacks for serverless environments
const resolvedFfmpeg = (ffmpegStatic as unknown as string) || process.env.FFMPEG_PATH || "ffmpeg";
const resolvedFfprobe = (ffprobeStatic as any)?.path || process.env.FFPROBE_PATH || "ffprobe";
ffmpeg.setFfmpegPath(resolvedFfmpeg);
ffmpeg.setFfprobePath(resolvedFfprobe);

export async function extractMetadata(filePath: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data as any);
    });
  });
}

type MetaOverrides = {
  title?: string;
  comment?: string;
  creation_time?: string;
};

export async function runFfmpegWithMetadata(inputPath: string, overrides: MetaOverrides) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(dir, `${base}_processed.mp4`);
  // 1) Try fast metadata-only rewrite (copy streams)
  try {
    await new Promise<void>((resolve, reject) => {
      let cmd = ffmpeg(inputPath)
        .outputOptions([
          "-y",
          "-map_metadata 0",
          `-metadata unique_id=${Date.now()}-${Math.random().toString(36).slice(2)}`,
          `-metadata encoder=AI-Content-Engine`,
          "-movflags +faststart",
          "-c copy",
        ]);
      if (overrides.title) cmd = cmd.outputOptions([`-metadata title=${overrides.title}`]);
      if (overrides.comment) cmd = cmd.outputOptions([`-metadata comment=${overrides.comment}`]);
      if (overrides.creation_time) cmd = cmd.outputOptions([`-metadata creation_time=${overrides.creation_time}`]);
      cmd.on("end", () => resolve()).on("error", reject).save(outputPath);
    });
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return { outputPath };
    }
  } catch (e) {
    console.log("[ffmpeg] copy failed, will transcode", (e as any)?.message || e);
  }

  // 2) Fallback to light transcode to force uniqueness
  await new Promise<void>((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .outputOptions([
        "-y",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        `-metadata unique_id=${Date.now()}-${Math.random().toString(36).slice(2)}`,
        `-metadata encoder=AI-Content-Engine`,
        "-map_metadata 0",
      ])
      .videoCodec("libx264")
      .audioCodec("aac");

    if (overrides.title) command = command.outputOptions([`-metadata title=${overrides.title}`]);
    if (overrides.comment) command = command.outputOptions([`-metadata comment=${overrides.comment}`]);
    if (overrides.creation_time) command = command.outputOptions([`-metadata creation_time=${overrides.creation_time}`]);

    command.on("end", () => resolve()).on("error", reject).save(outputPath);
  });

  return { outputPath };
}


