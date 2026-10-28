import { Module } from "@nestjs/common";
import { MangaTagsController } from "./manga-tags.controller";
import { MangaTagsService } from "./manga-tags.service";

@Module({
  controllers: [MangaTagsController],
  providers: [MangaTagsService],
})
export class MangaTagsModule {}
