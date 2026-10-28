/* TagsService — CRUD тегов через Prisma */
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.tag.findMany({ orderBy: { name: "asc" } });
  }

  async create(dto: CreateTagDto) {
    return this.prisma.tag.create({ data: { name: dto.name, color: dto.color ?? "#6b7280" } });
  }

  async update(id: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException("Tag not found");
    return this.prisma.tag.update({ where: { id }, data: { name: dto.name, color: dto.color } });
  }

  async delete(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException("Tag not found");
    await this.prisma.tag.delete({ where: { id } });
    return { ok: true };
  }
}
