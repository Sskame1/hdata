import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { MinioModule } from "./minio/minio.module";
import { TagsModule } from "./tags/tags.module";
import { CollectionsModule } from "./collections/collections.module";
import { FilesModule } from "./files/files.module";
import { LinksModule } from "./links/links.module";
import { AppsModule } from "./apps/apps.module";
import { GroupsModule } from "./groups/groups.module";
import { StatModule } from "./stat/stat.module";
import { MangaModule } from "./manga/manga.module";
import { MangaTagsModule } from "./manga-tags/manga-tags.module";

@Module({
  imports: [
    PrismaModule,
    MinioModule,
    TagsModule,
    CollectionsModule,
    FilesModule,
    LinksModule,
    AppsModule,
    GroupsModule,
    StatModule,
    MangaModule,
    MangaTagsModule,
  ],
})
export class AppModule {}
