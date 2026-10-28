import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MinioService } from "../minio/minio.service";
import { CreateMangaDto } from "./dto/create-manga.dto";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { v4 as uuid } from "uuid";

@Injectable()
export class MangaService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async list() {
    return this.prisma.manga.findMany({
      orderBy: { createdAt: "desc" },
      include: { mangaTags: { include: { tag: true } } },
    });
  }

  async get(id: string) {
    const manga = await this.prisma.manga.findUnique({
      where: { id },
      include: {
        chapters: { orderBy: { chapterNumber: "asc" } },
        mangaTags: { include: { tag: true } },
      },
    });
    if (!manga) throw new NotFoundException("Manga not found");
    return manga;
  }

  async create(dto: CreateMangaDto, coverFile?: Express.Multer.File, chapterFiles?: Express.Multer.File[]) {
    const manga = await this.prisma.manga.create({
      data: { title: dto.title, description: dto.description || null, coverFrom: dto.coverFrom || "first" },
    });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "manga-"));
    try {
      // Handle cover
      if (coverFile) {
        // User uploaded a cover image
        const thumbPath = `manga/thumbnails/${manga.id}.jpg`;
        const sharp = await import("sharp");
        const optimized = await sharp.default(coverFile.buffer).resize(400, 600, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();
        await this.minio.uploadBuffer(thumbPath, optimized, "image/jpeg");
        await this.prisma.manga.update({ where: { id: manga.id }, data: { coverImg: thumbPath, coverFrom: "upload" } });
      }

      // Handle chapter files
      if (chapterFiles && chapterFiles.length > 0) {
        for (let i = 0; i < chapterFiles.length; i++) {
          const file = chapterFiles[i];
          if (!file.mimetype.includes("pdf")) continue;
          const chNum = dto.coverFrom?.startsWith("page:") ? 0 : 1;
          const chapterNumber = i + 1;
          const chPath = `manga/${manga.id}/ch${chapterNumber}.pdf`;
          await this.minio.uploadBuffer(chPath, file.buffer, "application/pdf");

          let pageCount: number | null = dto.pageCount ?? null;
          if (pageCount === null) {
            try {
              pageCount = await this.countPdfPages(file.buffer);
            } catch {}
          }

          await this.prisma.mangaChapter.create({
            data: { mangaId: manga.id, chapterNumber, filePath: chPath, pageCount, size: file.size },
          });

          // Generate cover from first chapter if no cover uploaded
          if (!coverFile && i === 0) {
            await this.generateCoverFromPdf(manga.id, file.buffer, tmpDir, dto.coverFrom || "first");
          }
        }
      } else if (!coverFile) {
        // No cover and no chapters — generate a placeholder? Just leave coverImg null.
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    return this.prisma.manga.findUnique({ where: { id: manga.id }, include: { chapters: { orderBy: { chapterNumber: "asc" } } } });
  }

  async delete(id: string) {
    const manga = await this.prisma.manga.findUnique({ where: { id } });
    if (!manga) throw new NotFoundException("Manga not found");

    // Remove all files from MinIO
    const prefix = `manga/${id}/`;
    const objects = await this.minio.list(prefix);
    for (const name of objects) {
      await this.minio.remove(name).catch(() => {});
    }

    await this.prisma.manga.delete({ where: { id } });
    return { ok: true };
  }

  async uploadCover(id: string, file: Express.Multer.File) {
    const manga = await this.prisma.manga.findUnique({ where: { id } });
    if (!manga) throw new NotFoundException("Manga not found");

    const sharp = await import("sharp");
    const optimized = await sharp.default(file.buffer).resize(400, 600, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();
    const thumbPath = `manga/thumbnails/${id}.jpg`;
    await this.minio.uploadBuffer(thumbPath, optimized, "image/jpeg");

    return this.prisma.manga.update({
      where: { id },
      data: { coverImg: thumbPath, coverFrom: "upload" },
    });
  }

  async addChapter(id: string, chapterNumber: number, title: string | undefined, file: Express.Multer.File, manualPageCount?: number) {
    const manga = await this.prisma.manga.findUnique({ where: { id } });
    if (!manga) throw new NotFoundException("Manga not found");

    if (!file.mimetype.includes("pdf")) throw new BadRequestException("Only PDF files allowed");

    const chPath = `manga/${id}/ch${chapterNumber}.pdf`;
    await this.minio.uploadBuffer(chPath, file.buffer, "application/pdf");

    let pageCount: number | null = manualPageCount ?? null;
    if (pageCount === null) {
      try {
        pageCount = await this.countPdfPages(file.buffer);
      } catch {}
    }

    return this.prisma.mangaChapter.create({
      data: { mangaId: id, chapterNumber, title: title || null, filePath: chPath, pageCount, size: file.size },
    });
  }

  async deleteChapter(id: string, chapterId: string) {
    const chapter = await this.prisma.mangaChapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.mangaId !== id) throw new NotFoundException("Chapter not found");

    await this.minio.remove(chapter.filePath).catch(() => {});
    await this.prisma.mangaChapter.delete({ where: { id: chapterId } });
    return { ok: true };
  }

  async getCoverStream(id: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string } | null> {
    const manga = await this.prisma.manga.findUnique({ where: { id } });
    if (!manga || !manga.coverImg) return null;
    const stream = await this.minio.download(manga.coverImg);
    return { stream, mimeType: "image/jpeg" };
  }

  async getChapterPdf(id: string, chapterId: string) {
    const chapter = await this.prisma.mangaChapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.mangaId !== id) throw new NotFoundException("Chapter not found");
    const stream = await this.minio.download(chapter.filePath);
    return { stream, filename: path.basename(chapter.filePath) };
  }

  async regenerateCover(id: string, pageNum?: number) {
    const manga = await this.prisma.manga.findUnique({
      where: { id },
      include: { chapters: { orderBy: { chapterNumber: "asc" }, take: 1 } },
    });
    if (!manga) throw new NotFoundException("Manga not found");
    if (manga.chapters.length === 0) throw new BadRequestException("No chapters to generate cover from");

    const chapter = manga.chapters[0];
    const pdfBuffer = await this.minio.getBuffer(chapter.filePath);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "manga-"));
    try {
      const coverFrom = pageNum ? `page:${pageNum}` : "first";
      await this.generateCoverFromPdf(id, pdfBuffer, tmpDir, coverFrom);
      return this.prisma.manga.findUnique({ where: { id }, include: { chapters: { orderBy: { chapterNumber: "asc" } } } });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ---- Private helpers ----

  private async generateCoverFromPdf(mangaId: string, pdfBuffer: Buffer, tmpDir: string, coverFrom: string) {
    const pdfPath = path.join(tmpDir, "input.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);

    let page = 1;
    if (coverFrom?.startsWith("page:")) {
      page = parseInt(coverFrom.split(":")[1]) || 1;
    }

    const outPrefix = path.join(tmpDir, "cover");
    try {
      const { execSync } = await import("child_process");
      execSync(`pdftoppm -f ${page} -l ${page} -jpeg -scale-to 800 "${pdfPath}" "${outPrefix}"`, {
        shell: "/bin/sh",
        timeout: 30000,
      });

      const coverFile = fs.readdirSync(tmpDir).find((f) => f.startsWith("cover-") && (f.endsWith(".jpg") || f.endsWith(".jpeg")));
      if (!coverFile) throw new Error("pdftoppm produced no output");

      const coverBuffer = fs.readFileSync(path.join(tmpDir, coverFile));

      // Optimize with sharp
      const sharp = await import("sharp");
      const optimized = await sharp.default(coverBuffer).resize(400, 600, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer();

      const coverPath = `manga/thumbnails/${mangaId}.jpg`;
      await this.minio.uploadBuffer(coverPath, optimized, "image/jpeg");

      await this.prisma.manga.update({
        where: { id: mangaId },
        data: { coverImg: coverPath, coverFrom },
      });
    } catch (err) {
      console.error("Cover generation failed:", err);
    }
  }

  private async countPdfPages(buffer: Buffer): Promise<number> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdfpages-"));
    const pdfPath = path.join(tmpDir, "input.pdf");
    fs.writeFileSync(pdfPath, buffer);
    try {
      const { execSync } = await import("child_process");
      const output = execSync(`pdfinfo "${pdfPath}" 2>/dev/null || pdftoppm "${pdfPath}" /dev/null 2>&1; echo "NOPAGES"`, {
        shell: "/bin/sh",
        timeout: 15000,
      }).toString();
      const match = output.match(/Pages:\s*(\d+)/);
      if (match) return parseInt(match[1]);

      // Fallback: count pages via pdftoppm preview count
      const pageCount = execSync(`pdfinfo "${pdfPath}" 2>/dev/null | grep -i Pages | awk '{print $2}'`, {
        shell: "/bin/sh",
        timeout: 10000,
      }).toString().trim();
      if (pageCount && !isNaN(Number(pageCount))) return Number(pageCount);
      return 0;
    } catch {
      return 0;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
