import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

const TMP_DIR = join(import.meta.dirname, '..', '..', 'backend', 'uploads', 'tmp');

const s3Endpoint = process.env.S3_ENDPOINT;
const s3Enabled = !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);

if (s3Enabled) {
  await runS3();
} else {
  console.log('S3 env vars required. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY.');
  process.exit(1);
}

async function runS3() {
  const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const client = new S3Client({
    endpoint: s3Endpoint,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
  const bucket = process.env.S3_BUCKET || 'hdata';

  const objects = [];
  let token;
  do {
    const cmd = new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token });
    const resp = await client.send(cmd);
    if (resp.Contents) objects.push(...resp.Contents);
    token = resp.NextContinuationToken;
  } while (token);

  const gifKeys = objects
    .map(o => o.Key)
    .filter(k => /\.gif$/i.test(k) && !k.startsWith('tmp/') && k.startsWith('gif/'));

  let generated = 0;
  for (const gifKey of gifKeys) {
    const filename = gifKey.split('/').pop();
    const thumbFilename = filename.replace(/\.[^/.]+$/, '') + '.jpg';
    const thumbKey = `gif/thumbnails/${thumbFilename}`;

    if (objects.some(o => o.Key === thumbKey)) continue;

    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

    const tmpGif = join(TMP_DIR, filename);
    const tmpThumb = join(TMP_DIR, thumbFilename);

    try {
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: gifKey });
      const resp = await client.send(getCmd);
      const body = await resp.Body.transformToByteArray();
      writeFileSync(tmpGif, Buffer.from(body));

      execSync(`ffmpeg -i "${tmpGif}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${tmpThumb}" -y`, { stdio: 'ignore' });

      const thumbBuffer = readFileSync(tmpThumb);
      await client.send(new PutObjectCommand({
        Bucket: bucket, Key: thumbKey, Body: thumbBuffer, ContentType: 'image/jpeg',
      }));

      console.log(`Generated: ${thumbKey}`);
      generated++;
    } catch (err) {
      console.error(`Failed: ${gifKey} — ${err.message}`);
    } finally {
      if (existsSync(tmpGif)) unlinkSync(tmpGif);
      if (existsSync(tmpThumb)) unlinkSync(tmpThumb);
    }
  }
  console.log(`\nDone. Generated ${generated} thumbnails.`);
}
