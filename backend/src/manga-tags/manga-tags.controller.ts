import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { MangaTagsService } from "./manga-tags.service";
import { CreateMangaTagDto } from "./dto/create-manga-tag.dto";
import { UpdateMangaTagDto } from "./dto/update-manga-tag.dto";

@Controller("manga-tags")
export class MangaTagsController {
  constructor(private readonly service: MangaTagsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateMangaTagDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateMangaTagDto) {
    return this.service.update(id, dto);
  }

  @Delete()
  delete(@Query("id") id: string) {
    return this.service.delete(id);
  }

  // Junction: assign/unassign
  @Post("assign")
  assign(@Body() body: { mangaId: string; tagId: string }) {
    return this.service.assign(body.mangaId, body.tagId);
  }

  @Delete("assign")
  unassign(@Query("mangaId") mangaId: string, @Query("tagId") tagId: string) {
    return this.service.unassign(mangaId, tagId);
  }

  @Get("by-manga/:mangaId")
  byManga(@Param("mangaId") mangaId: string) {
    return this.service.byManga(mangaId);
  }
}
