import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createInterface } from "readline";
import { format } from "util";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const ACCESS_KEY = process.env.S3_ACCESS_KEY || "admin";
const SECRET_KEY = process.env.S3_SECRET_KEY || "admin123";
const BUCKET = process.env.S3_BUCKET || "hdata";

const client = new S3Client({
  endpoint: ENDPOINT,
  region: "us-east-1",
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

async function listAll(prefix = "") {
  const all = [];
  let token;
  do {
    const r = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }),
    );
    if (r.Contents) all.push(...r.Contents);
    token = r.NextContinuationToken;
  } while (token);
  return all;
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function fmtDate(d) {
  return (d || new Date()).toLocaleString();
}

async function cmdLs(args) {
  const prefix = args[0] || "";
  const objects = await listAll(prefix);
  if (objects.length === 0) return console.log("(empty)");

  const rows = objects
    .filter((o) => o.Key !== prefix)
    .map((o) => ({
      key: o.Key,
      size: o.Size,
      date: o.LastModified,
    }));

  const totalSize = rows.reduce((s, r) => s + r.size, 0);
  console.log(`\n  ${rows.length} objects, ${fmtSize(totalSize)}\n`);

  rows.forEach((r) => {
    console.log(`  ${r.key.padEnd(50)} ${fmtSize(r.size).padStart(9)}  ${fmtDate(r.date)}`);
  });
}

async function cmdRm(args) {
  const key = args[0];
  if (!key) return console.log("Usage: rm <key>");

  const askRes = await ask(`Delete "${key}"? (y/N): `);
  if (askRes.toLowerCase() !== "y") return console.log("Cancelled");

  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  console.log(`Deleted: ${key}`);

  const thumb = key.replace(/\.[^/.]+$/, "") + ".jpg";
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: thumb }));
    const delThumb = await ask(`Delete thumbnail "${thumb}"? (y/N): `);
    if (delThumb.toLowerCase() === "y") {
      await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: thumb }));
      console.log(`Deleted: ${thumb}`);
    }
  } catch {}
}

async function cmdBatchRm(args) {
  const pattern = args[0];
  if (!pattern) return console.log("Usage: batch-rm <prefix-pattern>");

  const all = await listAll(pattern);
  const matching = all.filter((o) => o.Key.startsWith(pattern));
  if (matching.length === 0) return console.log("No matches");

  console.log(`\n  ${matching.length} objects:\n`);
  matching.forEach((o) => console.log(`  ${o.Key}  ${fmtSize(o.Size)}`));

  const confirm = await ask(`\nDelete ALL ${matching.length} objects? (y/N): `);
  if (confirm.toLowerCase() !== "y") return console.log("Cancelled");

  const keys = matching.map((o) => ({ Key: o.Key }));

  while (keys.length > 0) {
    const batch = keys.splice(0, 1000);
    await client.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: batch } }));
    console.log(`Deleted ${batch.length}...`);
  }
  console.log("Done");
}

async function cmdMv(args) {
  const [src, dst] = args;
  if (!src || !dst) return console.log("Usage: mv <source-key> <dest-key>");

  await client.send(
    new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${src}`,
      Key: dst,
    }),
  );
  console.log(`Copied: ${src} → ${dst}`);

  const delSrc = await ask(`Delete source "${src}"? (y/N): `);
  if (delSrc.toLowerCase() === "y") {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: src }));
    console.log(`Deleted source: ${src}`);
  }
}

async function cmdBatchMv(args) {
  const [fromPrefix, toPrefix] = args;
  if (!fromPrefix || !toPrefix) return console.log("Usage: batch-mv <from-prefix> <to-prefix>");

  const all = await listAll(fromPrefix);
  const matching = all.filter(
    (o) => o.Key.startsWith(fromPrefix) && !o.Key.endsWith("/"),
  );
  if (matching.length === 0) return console.log("No matches");

  console.log(`\n  ${matching.length} objects to move:\n`);
  matching.slice(0, 20).forEach((o) => console.log(`  ${o.Key}`));
  if (matching.length > 20) console.log(`  ... and ${matching.length - 20} more`);

  const confirm = await ask(`\nMove ${matching.length} objects? (y/N): `);
  if (confirm.toLowerCase() !== "y") return console.log("Cancelled");

  let moved = 0;
  for (const obj of matching) {
    const suffix = obj.Key.slice(fromPrefix.length);
    const dest = toPrefix + suffix;
    await client.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${obj.Key}`,
        Key: dest,
      }),
    );
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
    moved++;
    if (moved % 50 === 0) console.log(`  Moved ${moved}/${matching.length}...`);
  }
  console.log(`Moved ${moved} objects`);
}

async function cmdFind(args) {
  const pattern = (args[0] || "").toLowerCase();
  if (!pattern) return console.log("Usage: find <name-pattern>");

  const all = await listAll();
  const matching = all.filter((o) => o.Key.toLowerCase().includes(pattern));
  if (matching.length === 0) return console.log("No matches");

  console.log(`\n  ${matching.length} matches:\n`);
  matching.forEach((o) => {
    console.log(`  ${o.Key.padEnd(50)} ${fmtSize(o.Size).padStart(9)}  ${fmtDate(o.LastModified)}`);
  });
}

async function cmdStats() {
  const all = await listAll();
  const totalSize = all.reduce((s, o) => s + (o.Size || 0), 0);
  const totalFiles = all.filter((o) => !o.Key.endsWith("/")).length;
  const jsonFiles = all.filter((o) => o.Key.endsWith(".json"));

  const byExt = {};
  all
    .filter((o) => !o.Key.endsWith("/") && !o.Key.endsWith(".json"))
    .forEach((o) => {
      const ext = o.Key.split(".").pop().toLowerCase();
      byExt[ext] = (byExt[ext] || 0) + 1;
    });

  console.log(`\n  Bucket: ${BUCKET}`);
  console.log(`  Endpoint: ${ENDPOINT}`);
  console.log(`  Total objects: ${all.length}`);
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  Total size: ${fmtSize(totalSize)}`);
  console.log(`  JSON metadata: ${jsonFiles.length}`);
  console.log(`\n  By type:`);
  Object.entries(byExt)
    .sort((a, b) => b[1] - a[1])
    .forEach(([ext, count]) => {
      const files = all.filter((o) => o.Key.endsWith("." + ext));
      const size = files.reduce((s, o) => s + (o.Size || 0), 0);
      console.log(`    .${ext}: ${count} files, ${fmtSize(size)}`);
    });
}

async function runCommand(cmd, args) {
  switch (cmd) {
    case "ls": return cmdLs(args);
    case "rm": return cmdRm(args);
    case "batch-rm": return cmdBatchRm(args);
    case "mv": return cmdMv(args);
    case "batch-mv": return cmdBatchMv(args);
    case "find": return cmdFind(args);
    case "stats": return cmdStats();
    default: console.log(`Unknown: ${cmd}`);
  }
}

async function main() {
  const execIdx = process.argv.indexOf("--exec");
  if (execIdx !== -1) {
    const parts = process.argv.slice(execIdx + 1);
    if (parts.length > 0) {
      await runCommand(parts[0].toLowerCase(), parts.slice(1));
    }
    rl.close();
    return;
  }

  console.log(`\n  ╔══════════════════════════╗`);
  console.log(`  ║     MINIO ADMIN          ║`);
  console.log(`  ╚══════════════════════════╝\n`);
  console.log(`  ${ENDPOINT} / ${BUCKET}\n`);

  while (true) {
    const line = (await ask("> ")).trim();
    if (!line) continue;
    const parts = line.split(" ").filter(Boolean);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      if (cmd === "exit" || cmd === "quit") break;
      else if (cmd === "help") {
        console.log(`
  ls [prefix]      List files
  rm <key>         Delete file (with thumbnail prompt)
  batch-rm <pre>   Delete all files matching prefix
  mv <src> <dst>   Copy (optionally delete source)
  batch-mv <fp> <tp>  Move all files from prefix to another
  find <pattern>   Search files by name
  stats            Storage statistics
  help             This menu
  exit             Quit

  One-shot: node index.js --exec stats
`);
      } else await runCommand(cmd, args);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
  rl.close();
}

main();
