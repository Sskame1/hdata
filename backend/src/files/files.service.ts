/* FilesService — основная бизнес-логика работы с медиафайлами.
   Загрузка → MinIO + генерация превью, список с фильтрацией, удаление,
   кэширование, регенерация превью, синхронизация из MinIO. */
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../minio/minio.service";
import * as path from "path";
import * as fs from "fs";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import { v4 as uuid } from "uuid";
import { Readable } from "stream";

const exec = promisify(execCb);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const CACHE_DIR = path.join(UPLOAD_DIR, "cache");

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  /* Список файлов с фильтрацией по типу, тегам, коллекциям.
     Исключает thumbnail-ключи (belt-and-suspenders). */
  async list(query: { type?: string; tagIds?: string; collectionIds?: string }) {
    const where: any = {};

    if (query.type) where.type = query.type;

    if (query.tagIds) {
      const ids = query.tagIds.split(",");
      where.tags = { some: { tagId: { in: ids } } };
    }

    if (query.collectionIds) {
      const ids = query.collectionIds.split(",");
      where.collections = { some: { collectionId: { in: ids } } };
    }

    // Исключаем пути превью, которые могли просочиться
    where.NOT = [
      { path: { endsWith: "_thumb.jpg" } },
      { path: { contains: "/thumbnails/" } },
    ];

    return this.prisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { tags: true, collections: true },
    });
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: { tags: true, collections: true },
    });
    if (!file) throw new NotFoundException("File not found");
    return file;
  }

  /* Удаление: MinIO (файл + превью) + Prisma */
  async delete(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException("File not found");

    await this.minio.remove(file.path);
    if (file.thumbnail) await this.minio.remove(file.thumbnail);

    await this.prisma.file.delete({ where: { id } });
    return { ok: true };
  }

  /* Загрузка файла: сохраняет в MinIO, генерирует превью.
     Для video: ffmpeg -movflags +faststart для оптимизации стриминга. */
  async upload(
    file: Express.Multer.File,
    type: string,
  ): Promise<{ id: string; path: string; thumbnail?: string }> {
    const ext = path.extname(file.originalname).toLowerCase();
    const objectKey = `${type}/${uuid()}${ext}`;

    let thumbnail: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let duration: number | null = null;
    let fileSize = file.size;
    let mimeType = file.mimetype;

    if (type === "video") {
      const tmpPath = path.join(UPLOAD_DIR, `${uuid()}${ext}`);
      fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
      fs.writeFileSync(tmpPath, file.buffer);

      let uploadPath = tmpPath;
      let uploadSize = file.size;

      /* Оптимизация MP4/MOV: faststart для веб-проигрывания */
      if (ext === ".mp4" || ext === ".mov") {
        const optPath = path.join(UPLOAD_DIR, `${uuid()}${ext}`);
        try {
          await exec(`ffmpeg -i "${tmpPath}" -c copy -movflags +faststart -y "${optPath}"`, { timeout: 120000 });
          const stat = fs.statSync(optPath);
          if (stat.size > 0) {
            try { fs.unlinkSync(uploadPath); } catch {}
            uploadPath = optPath;
            uploadSize = stat.size;
          }
        } catch {
          // faststart не удался — используем оригинал
        }
      }

      await this.minio.upload(objectKey, fs.createReadStream(uploadPath), uploadSize, mimeType);
      fileSize = uploadSize;

      const { generateVideoThumbnail } = await import("../common/thumbnails");
      const result = await generateVideoThumbnail(uploadPath, objectKey, this.minio);
      thumbnail = result.thumbnail;
      duration = result.duration;

      if (uploadPath !== tmpPath) try { fs.unlinkSync(uploadPath); } catch {}
      try { fs.unlinkSync(tmpPath); } catch {}

    } else if (type === "img") {
      await this.minio.upload(objectKey, Readable.from(file.buffer), file.size, file.mimetype);
      const { generateImageThumbnail } = await import("../common/thumbnails");
      thumbnail = await generateImageThumbnail(file.buffer, objectKey, this.minio);
    } else if (type === "gif") {
      await this.minio.upload(objectKey, Readable.from(file.buffer), file.size, file.mimetype);
      const { generateGifThumbnail } = await import("../common/thumbnails");
      thumbnail = await generateGifThumbnail(file.buffer, objectKey, this.minio);
    }

    const record = await this.prisma.file.create({
      data: {
        filename: file.originalname,
        path: objectKey,
        type,
        size: fileSize,
        mimeType,
        thumbnail,
        width,
        height,
        duration,
      },
    });

    return { id: record.id, path: objectKey, thumbnail: thumbnail ?? undefined };
  }

  async getThumbnail(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file || !file.thumbnail) throw new NotFoundException("Thumbnail not found");
    try {
      return await this.minio.download(file.thumbnail);
    } catch {
      await this.prisma.file.update({ where: { id }, data: { thumbnail: null } });
      throw new NotFoundException("Thumbnail not found");
    }
  }

  /* Регенерация всех превью: проверяет существование, создаёт缺失ющие */
  async regenerateThumbnails() {
    const files = await this.prisma.file.findMany({
      where: { type: { in: ["img", "video", "gif"] } },
    });

    type Result = { id: string; filename: string; status: string; error?: string };
    const results: Result[] = [];

    for (const file of files) {
      try {
        if (file.thumbnail) {
          try {
            await this.minio.stat(file.thumbnail);
            results.push({ id: file.id, filename: file.filename, status: "ok" });
            continue;
          } catch {
            // thumbnail missing in MinIO, regenerate
          }
        }

        const stream = await this.minio.download(file.path);
        const buffer = await streamToBuffer(stream);

        let newThumbnail: string;

        if (file.type === "gif") {
          const { generateGifThumbnail } = await import("../common/thumbnails");
          newThumbnail = await generateGifThumbnail(buffer, file.path, this.minio);
        } else if (file.type === "video") {
          const { generateVideoThumbnail } = await import("../common/thumbnails");
          const ext = path.extname(file.filename);
          const tmpPath = path.join(UPLOAD_DIR, `${uuid()}${ext}`);
          fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
          fs.writeFileSync(tmpPath, buffer);
          const result = await generateVideoThumbnail(tmpPath, file.path, this.minio);
          fs.unlinkSync(tmpPath);
          newThumbnail = result.thumbnail;
        } else if (file.type === "img") {
          const { generateImageThumbnail } = await import("../common/thumbnails");
          newThumbnail = await generateImageThumbnail(buffer, file.path, this.minio);
        } else {
          continue;
        }

        await this.prisma.file.update({
          where: { id: file.id },
          data: { thumbnail: newThumbnail },
        });

        results.push({ id: file.id, filename: file.filename, status: "regenerated" });
      } catch (err) {
        results.push({
          id: file.id,
          filename: file.filename,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  /* Синхронизация из MinIO: находит файлы без записи в Prisma и создаёт их */
  async syncFromStorage() {
    const allKeys = await this.minio.list("");

    // Exclude thumbnails, directories, and app files
    const mediaKeys = allKeys.filter((k) => {
      if (k.endsWith("/")) return false;
      if (k.startsWith("app/")) return false;
      if (k.endsWith("_thumb.jpg") || k.includes("/thumbnails/")) return false;
      return k.startsWith("img/") || k.startsWith("gif/") || k.startsWith("video/");
    });

    const existing = await this.prisma.file.findMany({ select: { path: true } });
    const existingPaths = new Set(existing.map((e) => e.path));

    const thumbKeys = new Set(allKeys.filter((k) => k.endsWith("_thumb.jpg")));

    type Result = { path: string; status: string; error?: string };
    const results: Result[] = [];

    for (const key of mediaKeys) {
      if (existingPaths.has(key)) {
        results.push({ path: key, status: "exists" });
        continue;
      }

      try {
        const stat = await this.minio.stat(key);

        const segs = key.split("/");
        const filename = segs[segs.length - 1];
        const type = key.startsWith("img/") ? "img"
          : key.startsWith("gif/") ? "gif"
          : key.startsWith("video/") ? "video"
          : "img";

        let thumbnail: string | null = null;
        if (type === "img") {
          const thumbKey = key.replace(/\.\w+$/, "_thumb.jpg");
          if (thumbKeys.has(thumbKey)) thumbnail = thumbKey;
        }

        await this.prisma.file.create({
          data: {
            filename,
            path: key,
            type,
            size: stat.size,
            mimeType: stat.metaData?.["content-type"] ?? guessMimeType(filename),
            thumbnail,
            createdAt: stat.lastModified ?? new Date(),
          },
        });

        results.push({ path: key, status: "created" });
      } catch (err) {
        results.push({
          path: key,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  async getFile(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException("File not found");
    return { stream: await this.minio.download(file.path), file };
  }

  /* Статистика локального кэша скачанных файлов */
  async cacheStats() {
    let totalSize = 0;
    let fileCount = 0;
    try {
      const entries = fs.readdirSync(CACHE_DIR, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(CACHE_DIR, entry.name);
        if (entry.isFile()) {
          totalSize += fs.statSync(fullPath).size;
          fileCount++;
        }
      }
    } catch {
      // cache dir doesn't exist yet
    }
    return { sizeBytes: totalSize, fileCount };
  }

  /* Очистка локального кэша */
  async clearCache() {
    try {
      const entries = fs.readdirSync(CACHE_DIR, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(CACHE_DIR, entry.name);
        if (entry.isFile()) fs.unlinkSync(fullPath);
      }
    } catch {
      // nothing to clear
    }
    return { ok: true };
  }

  /* Кэширование файла из MinIO локально в uploads/cache/ */
  async getLocalPath(id: string): Promise<{ localPath: string; file: any }> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException("File not found");

    const cacheKey = file.path.replace(/[\/\\]/g, "_");
    const localPath = path.join(CACHE_DIR, cacheKey);

    if (fs.existsSync(localPath)) return { localPath, file };

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const stream = await this.minio.download(file.path);
    const ws = fs.createWriteStream(localPath);
    await new Promise<void>((resolve, reject) => {
      stream.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      stream.on("error", reject);
    });

    return { localPath, file };
  }

  /* Переобработка видео: faststart или транскодинг в h264 */
  async reprocess(id: string, transcode = false) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException("File not found");
    if (file.type !== "video") throw new BadRequestException("Only video files can be reprocessed");

    const ext = path.extname(file.filename).toLowerCase();
    const tmpPath = path.join(UPLOAD_DIR, `${uuid()}${ext}`);
    fs.mkdirSync(path.dirname(tmpPath), { recursive: true });

    const stream = await this.minio.download(file.path);
    const ws = fs.createWriteStream(tmpPath);
    await new Promise<void>((resolve, reject) => {
      stream.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      stream.on("error", reject);
    });

    let uploadPath = tmpPath;
    let uploadSize = fs.statSync(tmpPath).size;

    if (transcode) {
      const optPath = path.join(UPLOAD_DIR, `${uuid()}${ext}`);
      try {
        await exec(
          `ffmpeg -i "${tmpPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart -y "${optPath}"`,
          { timeout: 300000 },
        );
        const stat = fs.statSync(optPath);
        if (stat.size > 0) {
          try { fs.unlinkSync(uploadPath); } catch {}
          uploadPath = optPath;
          uploadSize = stat.size;
        }
      } catch {}
    } else if (ext === ".mp4" || ext === ".mov") {
      const optPath = path.join(UPLOAD_DIR, `${uuid()}${ext}`);
      try {
        await exec(`ffmpeg -i "${tmpPath}" -c copy -movflags +faststart -y "${optPath}"`, { timeout: 120000 });
        const stat = fs.statSync(optPath);
        if (stat.size > 0) {
          try { fs.unlinkSync(uploadPath); } catch {}
          uploadPath = optPath;
          uploadSize = stat.size;
        }
      } catch {}
    }

    await this.minio.upload(file.path, fs.createReadStream(uploadPath), uploadSize, file.mimeType);

    const { generateVideoThumbnail } = await import("../common/thumbnails");
    const result = await generateVideoThumbnail(uploadPath, file.path, this.minio);

    await this.prisma.file.update({
      where: { id },
      data: { size: uploadSize, thumbnail: result.thumbnail, duration: result.duration },
    });

    if (uploadPath !== tmpPath) try { fs.unlinkSync(uploadPath); } catch {}
    try { fs.unlinkSync(tmpPath); } catch {}

    return { ok: true, size: uploadSize, duration: result.duration };
  }

  private storageStatsCache: { data: { usedBytes: number; totalBytes: number; availableBytes: number }; expiry: number } | null = null;

  /* Статистика дискового пространства (du/df) с кэшем 60 секунд */
  async storageStats() {
    const now = Date.now();
    if (this.storageStatsCache && now < this.storageStatsCache.expiry) {
      return this.storageStatsCache.data;
    }

    const storagePath = process.env.STORAGE_PATH || "/data";
    try {
      const [{ stdout: duOut }, { stdout: dfOut }] = await Promise.all([
        exec(`du -sb "${storagePath}"`, { timeout: 30000 }),
        exec(`df -k "${storagePath}"`, { timeout: 10000 }),
      ]);
      const usedBytes = parseInt(duOut.split("\t")[0], 10);
      const dfLines = dfOut.trim().split("\n");
      const parts = dfLines[dfLines.length - 1].split(/\s+/);
      const totalBytes = parseInt(parts[1], 10) * 1024;
      const availableBytes = parseInt(parts[3], 10) * 1024;
      const data = { usedBytes, totalBytes, availableBytes };
      this.storageStatsCache = { data, expiry: now + 60_000 };
      return data;
    } catch {
      return { usedBytes: 0, totalBytes: 0, availableBytes: 0 };
    }
  }
}

/* Определение MIME по расширению файла */
function guessMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".heic": "image/heic",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
  };
  return map[ext] ?? "application/octet-stream";
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
