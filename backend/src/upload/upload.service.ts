import { Injectable } from '@nestjs/common';
import { extname } from 'path';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Prisma } from '../generated/client.js';
import { S3Service } from '../storage/s3.service';
import { PrismaService } from '../database/database.service';

const execAsync = promisify(exec);
const API_URL = process.env.API_URL || 'http://localhost:3001';
let fileCounter = 0;

function getFileType(mimetype: string, filename: string): string {
  if (/\.gif$/i.test(filename) || mimetype === 'image/gif') return 'gif';
  if (mimetype.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v|ts)$/i.test(filename)) return 'video';
  if (mimetype.startsWith('image/')) return 'img';
  return 'doc';
}

function hasThumbnail(type: string): boolean {
  return type === 'video' || type === 'gif';
}

function thumbDir(type: string): string {
  return `${type}/thumbnails`;
}

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', mov: 'video/quicktime', svg: 'image/svg+xml', bmp: 'image/bmp',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip', rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed', txt: 'text/plain',
  json: 'application/json', xml: 'application/xml',
  html: 'text/html', css: 'text/css', js: 'application/javascript',
  ts: 'application/typescript', mp3: 'audio/mpeg', wav: 'audio/wav',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska',
};

@Injectable()
export class UploadService {
  private readonly tmpDir: string;

  constructor(
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {
    this.tmpDir = join(process.cwd(), 'uploads', 'tmp');
    if (!existsSync(this.tmpDir)) {
      mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File) {
    const timestamp = Date.now();
    fileCounter++;
    const ext = extname(file.originalname);
    const filename = `${timestamp}-${fileCounter}${ext}`;
    const type = getFileType(file.mimetype, filename);
    const storageKey = `${type}/${filename}`;

    await this.s3Service.putObject(storageKey, file.buffer, file.mimetype);

    const dbFile = await this.prisma.file.create({
      data: {
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        type,
        storageKey,
      },
    });

    if (hasThumbnail(type)) {
      void this.generateThumbnail(dbFile.id, storageKey, filename, type);
    }

    return this.toMediaItem(dbFile, null, []);
  }

  async getAllFiles() {
    const files = await this.prisma.file.findMany({
      include: {
        tags: { include: { tag: true } },
        collections: { include: { collection: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((f) => {
      const tags = f.tags.map((ft) => ft.tag.name);
      const collection = f.collections[0]?.collection ?? null;
      return this.toMediaItem(f, collection, tags);
    });
  }

  async deleteFile(filename: string): Promise<boolean> {
    const file = await this.prisma.file.findUnique({ where: { filename } });
    if (!file) return false;

    const keysToDelete = [file.storageKey];
    if (file.thumbnailKey) keysToDelete.push(file.thumbnailKey);

    await this.s3Service.deleteObjects(keysToDelete);
    await this.prisma.file.delete({ where: { id: file.id } });

    return true;
  }

  async generateThumbnail(fileId: string, storageKey: string, filename: string, type: string) {
    const thumbFilename = filename.replace(/\.[^/.]+$/, '') + '.jpg';
    const thumbKey = `${thumbDir(type)}/${thumbFilename}`;
    const tmpFile = join(this.tmpDir, filename);
    const tmpThumb = join(this.tmpDir, thumbFilename);

    try {
      const stream = await this.s3Service.getObjectStream(storageKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk);
      writeFileSync(tmpFile, Buffer.concat(chunks));

      const cmd = `ffmpeg -i "${tmpFile}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${tmpThumb}" -y`;
      await execAsync(cmd);

      const thumbBuffer = readFileSync(tmpThumb);
      await this.s3Service.putObject(thumbKey, thumbBuffer, 'image/jpeg');

      await this.prisma.file.update({
        where: { id: fileId },
        data: { thumbnailKey: thumbKey },
      });

      console.log('Thumbnail generated:', thumbKey);
    } catch (err) {
      console.error('Thumbnail error:', err);
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
      if (existsSync(tmpThumb)) unlinkSync(tmpThumb);
    }
  }

  async getTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async saveTags(tags: { id: string; name: string; color: string; count: number }[]) {
    for (const tag of tags) {
      await this.prisma.tag.upsert({
        where: { id: tag.id },
        update: { name: tag.name, color: tag.color, count: tag.count },
        create: { id: tag.id, name: tag.name, color: tag.color, count: tag.count },
      });
    }
    return { success: true };
  }

  async updateFileTags(filename: string, newTagNames: string[]) {
    const file = await this.prisma.file.findUnique({ where: { filename } });
    if (!file) return { success: false };

    await this.prisma.fileTag.deleteMany({ where: { fileId: file.id } });

    for (const name of newTagNames) {
      let tag = await this.prisma.tag.findUnique({ where: { name } });
      if (!tag) {
        tag = await this.prisma.tag.create({
          data: { name, color: '#888888' },
        });
      }
      await this.prisma.fileTag.create({
        data: { fileId: file.id, tagId: tag.id },
      });
    }

    await this.recalcTagCounts();
    return { success: true };
  }

  private async recalcTagCounts() {
    const tags = await this.prisma.tag.findMany({
      include: { files: true },
    });
    for (const tag of tags) {
      if (tag.files.length !== tag.count) {
        await this.prisma.tag.update({
          where: { id: tag.id },
          data: { count: tag.files.length },
        });
      }
    }
  }

  async getCollections() {
    const collections = await this.prisma.collection.findMany({
      include: { files: true },
      orderBy: { name: 'asc' },
    });
    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      count: c.files.length,
    }));
  }

  async saveCollections(collections: { id: string; name: string; color: string }[]) {
    const existingIds = new Set(collections.map((c) => c.id));
    const allExisting = await this.prisma.collection.findMany();
    const toRemove = allExisting.filter((c) => !existingIds.has(c.id));

    for (const col of toRemove) {
      await this.prisma.collection.delete({ where: { id: col.id } });
    }

    for (const col of collections) {
      await this.prisma.collection.upsert({
        where: { id: col.id },
        update: { name: col.name, color: col.color },
        create: { id: col.id, name: col.name, color: col.color },
      });
    }

    return { success: true };
  }

  async updateFileCollection(filename: string, collectionId: string | null) {
    const file = await this.prisma.file.findUnique({ where: { filename } });
    if (!file) return { success: false };

    await this.prisma.fileCollection.deleteMany({ where: { fileId: file.id } });

    if (collectionId) {
      const col = await this.prisma.collection.findUnique({ where: { id: collectionId } });
      if (!col) return { success: false };

      await this.prisma.fileCollection.create({
        data: { fileId: file.id, collectionId },
      });
    }

    return { success: true };
  }

  async getSettings() {
    let settings = await this.prisma.settings.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
      settings = await this.prisma.settings.create({
        data: { id: 'singleton', data: { STEALTH_MODE: false } },
      });
    }
    return settings.data as unknown as { STEALTH_MODE: boolean };
  }

  async saveSettings(data: { STEALTH_MODE: boolean }) {
    const jsonData = data as unknown as Prisma.InputJsonValue;
    await this.prisma.settings.upsert({
      where: { id: 'singleton' },
      update: { data: jsonData },
      create: { id: 'singleton', data: jsonData },
    });
    return { success: true };
  }

  async regenerateThumbnailByFilename(filename: string) {
    const file = await this.prisma.file.findUnique({ where: { filename } });
    if (file && hasThumbnail(file.type)) {
      await this.generateThumbnail(file.id, file.storageKey, file.filename, file.type);
    }
  }

  async getSyncData() {
    const files = await this.prisma.file.findMany({
      include: {
        tags: { include: { tag: true } },
        collections: { include: { collection: true } },
      },
    });

    return {
      files: files.map((f) => ({
        filename: f.filename,
        originalName: f.originalName,
        mimetype: f.mimetype,
        size: f.size,
        tags: f.tags.map((ft) => ft.tag.name),
        collection: f.collections[0]?.collection?.id ?? null,
        hash: `${f.filename}-${f.size}-${f.updatedAt.getTime()}`,
      })),
      tags: await this.prisma.tag.findMany(),
      collections: (await this.prisma.collection.findMany({
        include: { files: true },
      })).map((c) => ({ ...c, count: c.files.length })),
    };
  }

  async syncFiles(
    syncData: { filename: string; hash: string; tags?: string[]; collection?: string | null }[],
  ) {
    const existing = await this.prisma.file.findMany();
    const existingMap = new Map(existing.map((f) => [f.filename, f]));

    const result = { added: [] as string[], updated: [] as string[] };

    for (const item of syncData) {
      const existingFile = existingMap.get(item.filename);
      const currentHash = existingFile
        ? `${existingFile.filename}-${existingFile.size}-${existingFile.updatedAt.getTime()}`
        : null;

      if (!existingFile) {
        result.added.push(item.filename);
      } else if (currentHash !== item.hash) {
        result.updated.push(item.filename);
      }
    }

    return result;
  }

  private toMediaItem(
    file: { id: string; filename: string; originalName: string; mimetype: string; size: number; type: string; storageKey: string; thumbnailKey: string | null; createdAt: Date },
    collection: { id: string; name: string } | null,
    tags: string[],
  ) {
    const namePart = file.filename.substring(file.filename.indexOf('-') + 1);
    const originalName = namePart.includes('-')
      ? namePart.substring(namePart.indexOf('-') + 1)
      : namePart;

    return {
      id: file.id,
      url: `${API_URL}/media/${file.storageKey}`,
      thumbnailUrl: file.thumbnailKey
        ? `${API_URL}/media/${file.thumbnailKey}`
        : null,
      isVideoThumbnail: false,
      filename: file.filename,
      originalName: originalName || file.filename,
      mimetype: file.mimetype,
      size: file.size,
      tags,
      collection: collection?.id ?? null,
      collectionName: collection?.name ?? null,
      createdAt: file.createdAt.toISOString(),
    };
  }
}
