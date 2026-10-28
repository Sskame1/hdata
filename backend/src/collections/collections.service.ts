/* CollectionsService — CRUD коллекций через Prisma */
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.collection.findMany({ orderBy: { name: "asc" } });
  }

  async create(dto: CreateCollectionDto) {
    return this.prisma.collection.create({ data: { name: dto.name } });
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const col = await this.prisma.collection.findUnique({ where: { id } });
    if (!col) throw new NotFoundException("Collection not found");
    return this.prisma.collection.update({ where: { id }, data: { name: dto.name } });
  }

  async delete(id: string) {
    const col = await this.prisma.collection.findUnique({ where: { id } });
    if (!col) throw new NotFoundException("Collection not found");
    await this.prisma.collection.delete({ where: { id } });
    return { ok: true };
  }
}
