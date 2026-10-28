/* LinksService — управление связями M:N.
   Все link/unlink проверяют существование связи перед созданием.
   Bulk-операции вычисляют разницу и используют createMany. */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LinksService {
  constructor(private prisma: PrismaService) {}

  /* ---- tags-media ---- */
  async listTagMedia() {
    return this.prisma.fileTag.findMany();
  }

  async linkTagMedia(media: string, tagId: string) {
    const exists = await this.prisma.fileTag.findUnique({
      where: { fileId_tagId: { fileId: media, tagId } },
    });
    if (!exists) {
      await this.prisma.fileTag.create({ data: { fileId: media, tagId } });
    }
    return { ok: true };
  }

  async unlinkTagMedia(media: string, tagId: string) {
    await this.prisma.fileTag.delete({
      where: { fileId_tagId: { fileId: media, tagId } },
    });
    return { ok: true };
  }

  /* ---- collections-media ---- */
  async listCollectionMedia() {
    return this.prisma.fileCollection.findMany();
  }

  async linkCollectionMedia(media: string, collectionId: string) {
    const exists = await this.prisma.fileCollection.findUnique({
      where: { fileId_collectionId: { fileId: media, collectionId } },
    });
    if (!exists) {
      await this.prisma.fileCollection.create({ data: { fileId: media, collectionId } });
    }
    return { ok: true };
  }

  async unlinkCollectionMedia(media: string, collectionId: string) {
    await this.prisma.fileCollection.delete({
      where: { fileId_collectionId: { fileId: media, collectionId } },
    });
    return { ok: true };
  }

  /* ---- groups-media ---- */
  async listGroupMedia() {
    return this.prisma.fileCollectionGroup.findMany();
  }

  async linkGroupMedia(fileId: string, groupId: string) {
    const exists = await this.prisma.fileCollectionGroup.findUnique({
      where: { fileId_groupId: { fileId, groupId } },
    });
    if (!exists) {
      await this.prisma.fileCollectionGroup.create({ data: { fileId, groupId } });
    }
    return { ok: true };
  }

  async unlinkGroupMedia(fileId: string, groupId: string) {
    await this.prisma.fileCollectionGroup.delete({
      where: { fileId_groupId: { fileId, groupId } },
    });
    return { ok: true };
  }

  /* ---- bulk ---- */
  async bulkLinkTags(fileIds: string[], tagIds: string[]) {
    const existing = await this.prisma.fileTag.findMany({
      where: { fileId: { in: fileIds }, tagId: { in: tagIds } },
    });
    const existingSet = new Set(existing.map((e) => `${e.fileId}:${e.tagId}`));
    const toCreate: { fileId: string; tagId: string }[] = [];
    for (const fileId of fileIds) {
      for (const tagId of tagIds) {
        if (!existingSet.has(`${fileId}:${tagId}`)) {
          toCreate.push({ fileId, tagId });
        }
      }
    }
    if (toCreate.length > 0) {
      await this.prisma.fileTag.createMany({ data: toCreate });
    }
    return { ok: true, created: toCreate.length };
  }

  async bulkLinkCollections(fileIds: string[], collectionIds: string[]) {
    const existing = await this.prisma.fileCollection.findMany({
      where: { fileId: { in: fileIds }, collectionId: { in: collectionIds } },
    });
    const existingSet = new Set(existing.map((e) => `${e.fileId}:${e.collectionId}`));
    const toCreate: { fileId: string; collectionId: string }[] = [];
    for (const fileId of fileIds) {
      for (const collectionId of collectionIds) {
        if (!existingSet.has(`${fileId}:${collectionId}`)) {
          toCreate.push({ fileId, collectionId });
        }
      }
    }
    if (toCreate.length > 0) {
      await this.prisma.fileCollection.createMany({ data: toCreate });
    }
    return { ok: true, created: toCreate.length };
  }

  async bulkLinkGroups(fileIds: string[], groupIds: string[]) {
    const existing = await this.prisma.fileCollectionGroup.findMany({
      where: { fileId: { in: fileIds }, groupId: { in: groupIds } },
    });
    const existingSet = new Set(existing.map((e) => `${e.fileId}:${e.groupId}`));
    const toCreate: { fileId: string; groupId: string }[] = [];
    for (const fileId of fileIds) {
      for (const groupId of groupIds) {
        if (!existingSet.has(`${fileId}:${groupId}`)) {
          toCreate.push({ fileId, groupId });
        }
      }
    }
    if (toCreate.length > 0) {
      await this.prisma.fileCollectionGroup.createMany({ data: toCreate });
    }
    return { ok: true, created: toCreate.length };
  }
}
