/* GroupsService — CRUD групп внутри коллекций */
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  /* Все группы в коллекции */
  async list(collectionId: string) {
    return this.prisma.collectionGroup.findMany({
      where: { collectionId },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateGroupDto) {
    return this.prisma.collectionGroup.create({
      data: { name: dto.name, collectionId: dto.collectionId },
    });
  }

  async update(id: string, dto: UpdateGroupDto) {
    const group = await this.prisma.collectionGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException("Group not found");
    return this.prisma.collectionGroup.update({ where: { id }, data: { name: dto.name } });
  }

  async delete(id: string) {
    const group = await this.prisma.collectionGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException("Group not found");
    await this.prisma.collectionGroup.delete({ where: { id } });
    return { ok: true };
  }
}
