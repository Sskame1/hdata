/* AppsService — CRUD приложений. Все файлы хранятся в MinIO (app/{name}/...).
   Удаление чистит все связанные файлы из MinIO. */
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../minio/minio.service";
import { Readable } from "stream";
import { v4 as uuid } from "uuid";
import * as path from "path";

@Injectable()
export class AppsService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async list() {
    return this.prisma.app.findMany({
      orderBy: { createdAt: "desc" },
      include: { screenshots: { orderBy: { order: "asc" } }, videos: { orderBy: { order: "asc" } }, downloads: true },
    });
  }

  async findOne(id: string) {
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: { screenshots: { orderBy: { order: "asc" } }, videos: { orderBy: { order: "asc" } }, downloads: true },
    });
    if (!app) throw new NotFoundException("App not found");
    return app;
  }

  /* Создание: загружает каждый файл в MinIO, затем создаёт запись в Prisma */
  async create(
    name: string,
    description: string | undefined,
    version: string | undefined,
    cover?: Express.Multer.File,
    screenshots: Express.Multer.File[] = [],
    videos: Express.Multer.File[] = [],
    downloadFiles: Express.Multer.File[] = [],
  ) {
    let coverImg: string | null = null;
    if (cover) {
      const ext = path.extname(cover.originalname);
      coverImg = `app/${name}/${uuid()}${ext}`;
      await this.minio.upload(coverImg, Readable.from(cover.buffer), cover.size, cover.mimetype);
    }

    const screenshotData: { path: string; order: number }[] = [];
    for (let i = 0; i < screenshots.length; i++) {
      const ext = path.extname(screenshots[i].originalname);
      const key = `app/${name}/screenshots/${uuid()}${ext}`;
      await this.minio.upload(key, Readable.from(screenshots[i].buffer), screenshots[i].size, screenshots[i].mimetype);
      screenshotData.push({ path: key, order: i });
    }

    const videoData: { path: string; order: number }[] = [];
    for (let i = 0; i < videos.length; i++) {
      const ext = path.extname(videos[i].originalname);
      const key = `app/${name}/videos/${uuid()}${ext}`;
      await this.minio.upload(key, Readable.from(videos[i].buffer), videos[i].size, videos[i].mimetype);
      videoData.push({ path: key, order: i });
    }

    let totalSize = 0;
    const downloadData: { path: string; name: string; size: number; version: string | null }[] = [];
    for (const f of downloadFiles) {
      const ext = path.extname(f.originalname);
      const key = `app/${name}/downloads/${uuid()}${ext}`;
      await this.minio.upload(key, Readable.from(f.buffer), f.size, f.mimetype);
      totalSize += f.size;
      downloadData.push({ path: key, name: f.originalname, size: f.size, version: version ?? null });
    }

    const record = await this.prisma.app.create({
      data: {
        name,
        description: description ?? null,
        version: version ?? null,
        coverImg,
        size: totalSize || null,
        screenshots: { create: screenshotData },
        videos: { create: videoData },
        downloads: { create: downloadData },
      },
      include: { screenshots: { orderBy: { order: "asc" } }, videos: { orderBy: { order: "asc" } }, downloads: true },
    });

    return record;
  }

  /* Удаление: чистит все файлы из MinIO, затем запись из Prisma */
  async delete(id: string) {
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: { screenshots: true, videos: true, downloads: true },
    });
    if (!app) throw new NotFoundException("App not found");

    const keys: string[] = [];
    if (app.coverImg) keys.push(app.coverImg);
    for (const s of app.screenshots) keys.push(s.path);
    for (const v of app.videos) keys.push(v.path);
    for (const d of app.downloads) keys.push(d.path);

    await Promise.all(keys.map((k) => this.minio.remove(k).catch(() => {})));
    await this.prisma.app.delete({ where: { id } });
    return { ok: true };
  }

  async downloadFile(id: string, downloadId: string) {
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: { downloads: true },
    });
    if (!app) throw new NotFoundException("App not found");
    const dl = app.downloads.find((d) => d.id === downloadId);
    if (!dl) throw new NotFoundException("Download not found");
    const stream = await this.minio.download(dl.path);
    return { stream, name: dl.name, size: dl.size };
  }

  async getMedia(id: string, type: "screenshots" | "videos", mediaId: string) {
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: { screenshots: true, videos: true },
    });
    if (!app) throw new NotFoundException("App not found");
    const items = type === "screenshots" ? app.screenshots : app.videos;
    const item = items.find((m) => m.id === mediaId);
    if (!item) throw new NotFoundException("Media not found");
    return this.minio.download(item.path);
  }

  async getCover(id: string) {
    const app = await this.prisma.app.findUnique({ where: { id } });
    if (!app) throw new NotFoundException("App not found");
    if (!app.coverImg) throw new NotFoundException("No cover image");
    return this.minio.download(app.coverImg);
  }
}
