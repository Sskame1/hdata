import express from "express";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const PORT = process.env.PORT || 4000;
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

const app = express();
app.use(express.json());

async function listAll(prefix = "") {
  const all = [];
  let token;
  do {
    const r = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    if (r.Contents) all.push(...r.Contents);
    token = r.NextContinuationToken;
  } while (token);
  return all;
}

app.get("/api/list", async (req, res) => {
  try {
    const prefix = req.query.prefix || "";
    const objects = await listAll(prefix);
    const files = objects
      .filter((o) => o.Key !== prefix)
      .map((o) => ({
        key: o.Key,
        size: o.Size,
        lastModified: o.LastModified,
        ext: o.Key.split(".").pop()?.toLowerCase() || "",
      }));
    res.json({ files, total: files.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const all = await listAll();
    const totalSize = all.reduce((s, o) => s + (o.Size || 0), 0);
    const totalFiles = all.filter((o) => !o.Key.endsWith("/")).length;
    const byExt = {};
    all
      .filter((o) => !o.Key.endsWith("/") && !o.Key.endsWith(".json"))
      .forEach((o) => {
        const ext = o.Key.split(".").pop()?.toLowerCase();
        if (ext) byExt[ext] = (byExt[ext] || 0) + 1;
      });
    res.json({ totalFiles, totalSize, byExt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/objects", async (req, res) => {
  try {
    const { keys } = req.body;
    if (!keys || keys.length === 0)
      return res.status(400).json({ error: "No keys provided" });

    while (keys.length > 0) {
      const batch = keys.splice(0, 1000).map((k) => ({ Key: k }));
      await client.send(
        new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: batch } }),
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/move", async (req, res) => {
  try {
    const { source, destination } = req.body;
    if (!source || !destination)
      return res.status(400).json({ error: "source and destination required" });

    await client.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${source}`,
        Key: destination,
      }),
    );
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: source }));
    res.json({ success: true, source, destination });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/batch-move", async (req, res) => {
  try {
    const { fromPrefix, toPrefix } = req.body;
    if (!fromPrefix || !toPrefix)
      return res.status(400).json({ error: "fromPrefix and toPrefix required" });

    const all = await listAll(fromPrefix);
    const matching = all.filter(
      (o) => o.Key.startsWith(fromPrefix) && !o.Key.endsWith("/"),
    );
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
    }
    res.json({ success: true, moved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/proxy", async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).send("key required");

    const r = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const ext = key.split(".").pop()?.toLowerCase() || "";
    const mimeTypes = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      gif: "image/gif", webp: "image/webp", mp4: "video/mp4",
      webm: "video/webm", mov: "video/quicktime",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", r.ContentLength);
    r.Body.pipe(res);
  } catch (err) {
    res.status(404).send("Not found");
  }
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`MinIO Web running at http://localhost:${PORT}`);
  console.log(`Bucket: ${BUCKET} via ${ENDPOINT}`);
});
