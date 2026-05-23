import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || 'admin';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || 'admin123';
const S3_BUCKET = process.env.S3_BUCKET || 'hdata';
const PG_URL = process.env.DATABASE_URL || 'postgresql://hdata:hdata@localhost:5432/hdata';

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: 'us-east-1',
  credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  forcePathStyle: true,
});

function getFileType(mimetype, filename) {
  if (/\.gif$/i.test(filename) || mimetype === 'image/gif') return 'gif';
  if (mimetype.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v|ts)$/i.test(filename)) return 'video';
  if (mimetype.startsWith('image/')) return 'img';
  return 'doc';
}

function getMimeFromExt(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4',
    webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', m4v: 'video/mp4', ts: 'video/mp2t',
    pdf: 'application/pdf', zip: 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

async function listAllObjects() {
  const all = [];
  let token;
  do {
    const cmd = new ListObjectsV2Command({ Bucket: S3_BUCKET, ContinuationToken: token });
    const resp = await client.send(cmd);
    if (resp.Contents) all.push(...resp.Contents);
    token = resp.NextContinuationToken;
  } while (token);
  return all;
}

async function getJsonObject(key) {
  try {
    const resp = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const body = await resp.Body.transformToString();
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function objectExists(key) {
  try {
    await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function migrate() {
  console.log('Listing all objects from MinIO...');
  const objects = await listAllObjects();
  console.log(`Found ${objects.length} objects`);

  const jsonFiles = ['tags.json', 'file-tags.json', 'collections.json', 'file-collections.json', 'settings.json'];
  const jsonData = {};
  for (const jf of jsonFiles) {
    jsonData[jf] = await getJsonObject(jf);
    if (jsonData[jf]) console.log(`Loaded ${jf}`);
    else console.log(`No ${jf} found`);
  }

  const mediaObjects = objects.filter(o => {
    const key = o.Key;
    if (key.startsWith('tmp/')) return false;
    if (jsonFiles.includes(key)) return false;
    if (key.endsWith('.jpg') && key.split('/').length === 1 && mediaObjects?.length) {
      const baseName = key.replace(/\.jpg$/, '');
      const anyExt = mediaObjects.some(m => m.Key === `${baseName}.png` || m.Key === `${baseName}.mp4`);
      if (anyExt) return false;
    }
    return true;
  });

  console.log(`Found ${mediaObjects.length} media objects to process`);

  const { PrismaClient } = await import('./dist/src/generated/client.js');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const adapter = new PrismaPg({ connectionString: PG_URL });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const fileTags = jsonData['file-tags.json'] || {};
  const fileCollections = jsonData['file-collections.json'] || {};
  const tagsList = jsonData['tags.json'] || [];
  const collectionsList = jsonData['collections.json'] || [];
  const settingsData = jsonData['settings.json'] || { STEALTH_MODE: false };

  for (const tag of tagsList) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: { name: tag.name, color: tag.color, count: tag.count },
      create: { id: tag.id, name: tag.name, color: tag.color, count: tag.count },
    });
  }
  console.log(`Imported ${tagsList.length} tags`);

  for (const col of collectionsList) {
    await prisma.collection.upsert({
      where: { id: col.id },
      update: { name: col.name, color: col.color },
      create: { id: col.id, name: col.name, color: col.color },
    });
  }
  console.log(`Imported ${collectionsList.length} collections`);

  if (settingsData) {
    await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: { data: settingsData },
      create: { id: 'singleton', data: settingsData },
    });
    console.log('Imported settings');
  }

  let migrated = 0;
  let skipped = 0;

  for (const obj of mediaObjects) {
    const oldKey = obj.Key;
    const parts = oldKey.split('/');
    const filename = parts[parts.length - 1];
    const collectionInPath = parts.length > 1 ? parts[0] : null;

    if (jsonFiles.includes(filename)) continue;
    if (filename.endsWith('.jpg') && collectionInPath === 'tmp') continue;

    const thumbFilename = filename.replace(/\.[^/.]+$/, '') + '.jpg';
    const mime = getMimeFromExt(filename);
    const type = getFileType(mime, filename);
    const newKey = `${type}/${filename}`;
    const newThumbKey = `${type}/thumbnails/${thumbFilename}`;

    const existing = await prisma.file.findUnique({ where: { filename } });
    if (existing) {
      skipped++;
      continue;
    }

    if (oldKey !== newKey) {
      console.log(`Moving ${oldKey} → ${newKey}`);
      await client.send(new CopyObjectCommand({
        Bucket: S3_BUCKET,
        CopySource: `${S3_BUCKET}/${oldKey}`,
        Key: newKey,
      }));

      const oldThumbKey = collectionInPath ? `${collectionInPath}/${thumbFilename}` : thumbFilename;
      if (await objectExists(oldThumbKey)) {
        await client.send(new CopyObjectCommand({
          Bucket: S3_BUCKET,
          CopySource: `${S3_BUCKET}/${oldThumbKey}`,
          Key: newThumbKey,
        }));
        await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: oldThumbKey }));
      }

      await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: oldKey }));
    }

    const namePart = filename.includes('-') ? filename.substring(filename.indexOf('-') + 1) : filename;
    const originalName = namePart.includes('-') ? namePart.substring(namePart.indexOf('-') + 1) : namePart;
    const collectionId = fileCollections[filename] || null;

    const dbFile = await prisma.file.create({
      data: {
        filename,
        originalName: originalName || filename,
        mimetype: mime,
        size: obj.Size || 0,
        type,
        storageKey: newKey,
        thumbnailKey: (await objectExists(newThumbKey)) ? newThumbKey : null,
        createdAt: obj.LastModified || new Date(),
      },
    });

    const fileTagNames = fileTags[filename];
    if (fileTagNames?.length) {
      for (const tagName of fileTagNames) {
        let tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await prisma.tag.create({ data: { name: tagName, color: '#888888' } });
        }
        await prisma.fileTag.create({ data: { fileId: dbFile.id, tagId: tag.id } });
      }
    }

    if (collectionId) {
      const col = await prisma.collection.findUnique({ where: { id: collectionId } });
      if (col) {
        await prisma.fileCollection.create({ data: { fileId: dbFile.id, collectionId } });
      }
    }

    migrated++;
    if (migrated % 100 === 0) console.log(`Progress: ${migrated} files migrated`);
  }

  await prisma.tag.updateMany({ data: { count: 0 } });
  const tagsWithCounts = await prisma.tag.findMany({ include: { files: true } });
  for (const tag of tagsWithCounts) {
    await prisma.tag.update({ where: { id: tag.id }, data: { count: tag.files.length } });
  }

  console.log(`\nDone! Migrated: ${migrated}, Skipped (already exist): ${skipped}`);

  const yes = process.argv.includes('--cleanup');
  if (yes) {
    console.log('Removing old flat objects...');
    const toDelete = mediaObjects
      .filter(o => !o.Key.startsWith('img/') && !o.Key.startsWith('video/') && !o.Key.startsWith('gif/') && !o.Key.startsWith('doc/') && !jsonFiles.includes(o.Key) && !o.Key.startsWith('tmp/'))
      .map(o => ({ Key: o.Key }));

    for (let i = 0; i < toDelete.length; i += 1000) {
      const batch = toDelete.slice(i, i + 1000);
      await client.send(new DeleteObjectsCommand({ Bucket: S3_BUCKET, Delete: { Objects: batch } }));
    }
    console.log(`Deleted ${toDelete.length} old objects`);
  } else {
    console.log('Skipping cleanup. Run with --cleanup to remove old flat objects.');
  }

  await prisma.$disconnect();
}

migrate().catch(console.error);
