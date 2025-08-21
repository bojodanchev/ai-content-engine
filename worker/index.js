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

  // process (copy-mode first)
  const baseArgs = [
    "-y", "-i", tmpIn,
    "-map", "0",
    "-c", "copy",
    "-map_metadata", "-1",
    "-metadata", `title=AI Content Engine export`,
    "-metadata", `comment=job_id=${jobId}`,
    "-metadata", `creation_time=${new Date().toISOString()}`,
  ];
  const args = container === "webm" ? [...baseArgs, tmpOut] : [...baseArgs, "-movflags", "use_metadata_tags+faststart", tmpOut];
  try {
    await run("ffmpeg", args);
  } catch (e) {
    // fallback transcode
    const t = [
      "-y", "-i", tmpIn,
      "-map_metadata", "-1",
      "-metadata", `title=AI Content Engine export`,
      "-metadata", `comment=job_id=${jobId}`,
      "-metadata", `creation_time=${new Date().toISOString()}`,
      ...(container === "webm" ? [] : ["-movflags", "use_metadata_tags+faststart"]),
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264",
      "-c:a", "aac",
      tmpOut,
    ];
    await run("ffmpeg", t);
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
      JSON.stringify({ processedKey, preset, processedAt: new Date().toISOString() }),
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


