import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalFiles, filesByType, totalTags, totalCollections, totalGroups, totalApps, totalManga, tagsWithCount, collectionsWithCount, groupsWithCount, fileTagCounts, fileCollectionCounts, fileGroupCounts, totalSize, storageStats] = await Promise.all([
      this.prisma.file.count(),
      this.prisma.file.groupBy({ by: ["type"], _count: { id: true } }),
      this.prisma.tag.count(),
      this.prisma.collection.count(),
      this.prisma.collectionGroup.count(),
      this.prisma.app.count(),
      this.prisma.manga.count(),
      this.prisma.tag.findMany({ select: { id: true, name: true, color: true, _count: { select: { files: true } } }, orderBy: { files: { _count: "desc" } } }),
      this.prisma.collection.findMany({ select: { id: true, name: true, _count: { select: { files: true } } }, orderBy: { files: { _count: "desc" } } }),
      this.prisma.collectionGroup.findMany({ select: { id: true, name: true, collection: { select: { name: true } }, _count: { select: { files: true } } }, orderBy: { files: { _count: "desc" } } }),
      this.prisma.fileTag.groupBy({ by: ["fileId"], _count: { fileId: true } }),
      this.prisma.fileCollection.groupBy({ by: ["fileId"], _count: { fileId: true } }),
      this.prisma.fileCollectionGroup.groupBy({ by: ["fileId"], _count: { fileId: true } }),
      this.prisma.file.aggregate({ _sum: { size: true } }),
      this.getStorageStats().catch(() => null),
    ]);

    const countsByType: Record<string, number> = {};
    for (const entry of filesByType) {
      countsByType[entry.type] = entry._count.id;
    }

    const avg = (arr: { _count: { fileId: number } }[]) => {
      if (arr.length === 0) return { min: 0, max: 0, avg: 0 };
      const values = arr.map((x) => x._count.fileId);
      return { min: Math.min(...values), max: Math.max(...values), avg: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) };
    };

    return {
      counts: {
        files: totalFiles,
        images: countsByType["img"] ?? 0,
        gifs: countsByType["gif"] ?? 0,
        videos: countsByType["video"] ?? 0,
        tags: totalTags,
        collections: totalCollections,
        collectionGroups: totalGroups,
        apps: totalApps,
        manga: totalManga,
        dbSizeBytes: Number(totalSize._sum.size ?? 0n),
      },
      distribution: {
        filesPerTag: tagsWithCount.map((t) => ({ tagId: t.id, tagName: t.name, tagColor: t.color, count: t._count.files })),
        filesPerCollection: collectionsWithCount.map((c) => ({ collectionId: c.id, collectionName: c.name, count: c._count.files })),
        filesPerGroup: groupsWithCount.map((g) => ({ groupId: g.id, groupName: g.name, collectionName: g.collection.name, count: g._count.files })),
        tagsPerFile: avg(fileTagCounts),
        collectionsPerFile: avg(fileCollectionCounts),
        groupsPerFile: avg(fileGroupCounts),
      },
      storage: storageStats,
    };
  }

  private async getStorageStats() {
    const { execSync } = await import("child_process");
    const storagePath = process.env.STORAGE_PATH || "/app/uploads";
    try {
      const du = execSync(`du -sb "${storagePath}" 2>/dev/null || echo "0"`, { shell: "/bin/sh", timeout: 5000 }).toString().trim().split(/\s/)[0];
      const df = execSync(`df -B1 "${storagePath}" 2>/dev/null | tail -1`, { shell: "/bin/sh", timeout: 5000 }).toString().trim().split(/\s+/);
      return {
        usedBytes: Number(du) || 0,
        totalBytes: Number(df?.[1]) || 0,
        availableBytes: Number(df?.[3]) || 0,
      };
    } catch {
      return null;
    }
  }
}
