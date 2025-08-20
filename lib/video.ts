import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobeStatic from "ffprobe-static";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobeStatic.path);

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
  await new Promise<void>((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .outputOptions([
        "-map_metadata 0",
        "-c copy",
        // inject a few benign container-level tags to improve uniqueness
        `-metadata unique_id=${Date.now()}-${Math.random().toString(36).slice(2)}`,
        `-metadata encoder=AI-Content-Engine`,
      ]);

    // Apply overrides to container metadata
    if (overrides.title) command = command.outputOptions([`-metadata title=${overrides.title}`]);
    if (overrides.comment) command = command.outputOptions([`-metadata comment=${overrides.comment}`]);
    if (overrides.creation_time) command = command.outputOptions([`-metadata creation_time=${overrides.creation_time}`]);

    command.on("end", () => resolve()).on("error", reject).save(outputPath);
  });

  // Make "unique" by light-touch transcoding or stream map rewrite if copy fails
  const stats = fs.statSync(outputPath);
  if (!stats.size) {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-movflags +faststart",
          "-pix_fmt yuv420p",
          // slight GOP/keyint jitter and timebase remux can also alter file signature
          "-g 249",
          "-preset veryfast",
        ])
        .videoCodec("libx264")
        .audioCodec("aac")
        .on("end", () => resolve())
        .on("error", reject)
        .save(outputPath);
    });
  }

  return { outputPath };
}


