import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMangaTagDto } from "./dto/create-manga-tag.dto";
import { UpdateMangaTagDto } from "./dto/update-manga-tag.dto";

@Injectable()
export class MangaTagsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.mangaTag.findMany({ orderBy: { name: "asc" } });
  }

  async create(dto: CreateMangaTagDto) {
    return this.prisma.mangaTag.create({ data: { name: dto.name, color: dto.color ?? "#6b7280" } });
  }

  async update(id: string, dto: UpdateMangaTagDto) {
    const tag = await this.prisma.mangaTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException("MangaTag not found");
    return this.prisma.mangaTag.update({ where: { id }, data: { name: dto.name, color: dto.color } });
  }

  async delete(id: string) {
    const tag = await this.prisma.mangaTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException("MangaTag not found");
    await this.prisma.mangaTag.delete({ where: { id } });
    return { ok: true };
  }

  // Junction: assign tag ↔ manga
  async assign(mangaId: string, tagId: string) {
    const manga = await this.prisma.manga.findUnique({ where: { id: mangaId } });
    if (!manga) throw new NotFoundException("Manga not found");
    const tag = await this.prisma.mangaTag.findUnique({ where: { id: tagId } });
    if (!tag) throw new NotFoundException("Tag not found");
    return this.prisma.mangaTagManga.upsert({
      where: { mangaId_tagId: { mangaId, tagId } },
      create: { mangaId, tagId },
      update: {},
    });
  }

  async unassign(mangaId: string, tagId: string) {
    await this.prisma.mangaTagManga.deleteMany({ where: { mangaId, tagId } });
    return { ok: true };
  }

  async byManga(mangaId: string) {
    return this.prisma.mangaTagManga.findMany({
      where: { mangaId },
      include: { tag: true },
    });
  }
}
