import "server-only";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
ffmpeg.setFfprobePath((ffprobeStatic as any).path);

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
  // Always transcode to ensure a new file signature and inject metadata
  await new Promise<void>((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .outputOptions([
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-g 249",
        "-preset veryfast",
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


