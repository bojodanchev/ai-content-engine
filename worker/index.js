"use strict";

const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Client: PgClient } = require("pg");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REGION = process.env.AWS_REGION;
const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;
const BUCKET = process.env.AWS_S3_BUCKET;

if (!REGION || !QUEUE_URL || !BUCKET) {
  console.error("Missing required env: AWS_REGION, AWS_SQS_QUEUE_URL, AWS_S3_BUCKET");
  process.exit(1);
}

const sqs = new SQSClient({ region: REGION });
const s3 = new S3Client({ region: REGION });
const pg = new PgClient({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pg.connect().catch(err => { console.error("[worker] pg connect error", err); process.exit(1); });

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", c => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args);
    let stderr = "";
    child.stderr.on("data", d => stderr += String(d));
    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `exit ${code}`));
    });
  });
}

async function handleMessage(body) {
  const { jobId, key, preset = "default", userId } = JSON.parse(body);
  console.log("[worker] received", { jobId, key });
  const tmpIn = path.join(os.tmpdir(), `${jobId}-${path.basename(key)}`);
  const ext = path.extname(key).toLowerCase();
  const container = ext === ".webm" ? "webm" : ext === ".mov" ? "mov" : "mp4";
  const tmpOut = path.join(os.tmpdir(), `${jobId}-processed${ext || ".mp4"}`);

  // download
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const buf = await streamToBuffer(obj.Body);
  fs.writeFileSync(tmpIn, buf);

  // Very light transforms to alter fingerprint while preserving perceived quality
  // - Video: scale to even dims, slight eq tweak, tiny temporal noise, micro drawbox for 1–2 frames
  // - Audio: ±0.2% pitch shift using asetrate + atempo to preserve duration
  // Choose deterministic deltas from jobId to keep idempotency
  function pseudoRandomFromString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = (h ^ str.charCodeAt(i)) * 16777619 >>> 0;
    return (h % 10000) / 10000; // 0..1
  }
  const r = pseudoRandomFromString(jobId);
  const pitchDelta = (r * 0.004) - 0.002; // -0.2% .. +0.2%
  const tMark = 0.15 + (r * 0.2); // overlay around 0.15s..0.35s

  if (container === "webm") {
    // For WebM keep metadata-only to avoid heavy VP9/Opus re-encode in Fargate
    const args = [
      "-y", "-i", tmpIn,
      "-map", "0",
      "-c", "copy",
      "-map_metadata", "-1",
      "-metadata", `title=AI Content Engine export`,
      "-metadata", `comment=job_id=${jobId}`,
      "-metadata", `creation_time=${new Date().toISOString()}`,
      tmpOut,
    ];
    await run("ffmpeg", args);
  } else {
    // MP4/MOV minimal, near-lossless transcode with micro transforms
    const vf = `scale=trunc(iw/2)*2:trunc(ih/2)*2,eq=brightness=0.005:contrast=1.01:saturation=1.01,noise=alls=2:allf=t,drawbox=x=w-2:y=h-2:w=1:h=1:color=white@0.02:t=fill:enable='between(t,${tMark.toFixed(3)},${(tMark+0.04).toFixed(3)})'`;
    const pitch = 1 + pitchDelta;
    const af = `asetrate=48000*${pitch.toFixed(5)},atempo=${(1 / pitch).toFixed(5)},aresample=48000`;
    const args = [
      "-y", "-i", tmpIn,
      "-map_metadata", "-1",
      "-metadata", `title=AI Content Engine export`,
      "-metadata", `comment=job_id=${jobId}`,
      "-metadata", `creation_time=${new Date().toISOString()}`,
      "-movflags", "use_metadata_tags+faststart",
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
      "-vf", vf,
      "-c:a", "aac", "-ar", "48000", "-af", af,
      tmpOut,
    ];
    await run("ffmpeg", args);
  }

  // upload processed
  const processedKey = `processed/${jobId}${ext || ".mp4"}`;
  const outBuf = fs.readFileSync(tmpOut);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: processedKey, Body: outBuf, ContentType: "video/mp4" }));

  await pg.query(
    'update "Job" set status=$1, "outputFilename"=$2, "updatedAt"=now(), "metaJson"=$3 where id=$4',
    [
      'completed',
      path.basename(tmpOut),
      JSON.stringify({ processedKey, preset, processedAt: new Date().toISOString(), transform: { pitchDelta, eq: { brightness: 0.005, contrast: 1.01, saturation: 1.01 }, noise: { alls: 2, allf: 't' }, overlay: { tFrom: tMark, tTo: tMark + 0.04 } } }),
      jobId,
    ]
  );
  console.log("[worker] completed", { jobId, processedKey });
}

async function loop() {
  while (true) {
    try {
      const res = await sqs.send(new ReceiveMessageCommand({ QueueUrl: QUEUE_URL, MaxNumberOfMessages: 1, WaitTimeSeconds: 20, VisibilityTimeout: 60 }));
      const msgs = res.Messages || [];
      for (const m of msgs) {
        try {
          await handleMessage(m.Body);
          await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: m.ReceiptHandle }));
        } catch (e) {
          try {
            await pg.query(
              'update "Job" set status=$1, "updatedAt"=now(), "metaJson"=$2 where id=$3',
              ['failed', JSON.stringify({ error: String(e) }), JSON.stringify(jobId).replace(/"/g,'').trim()]
            );
          } catch (_) {}
          console.error("[worker] job failed", e);
        }
      }
    } catch (e) {
      console.error("[worker] poll error", e);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

loop().catch(err => { console.error(err); process.exit(1); });


