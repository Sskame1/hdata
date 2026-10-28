/* Управление связями M:N: теги↔файлы, коллекции↔файлы + bulk-операции */
import { Controller, Get, Post, Delete, Body, Query } from "@nestjs/common";
import { LinksService } from "./links.service";

@Controller()
export class LinksController {
  constructor(private readonly service: LinksService) {}

  /* ---- tags-media ---- */
  @Get("tags-media")
  listTagMedia() {
    return this.service.listTagMedia();
  }

  @Post("tags-media")
  linkTagMedia(@Body("media") media: string, @Body("tagId") tagId: string) {
    return this.service.linkTagMedia(media, tagId);
  }

  @Delete("tags-media")
  unlinkTagMedia(@Query("media") media: string, @Query("tagId") tagId: string) {
    return this.service.unlinkTagMedia(media, tagId);
  }

  /* ---- collections-media ---- */
  @Get("collections-media")
  listCollectionMedia() {
    return this.service.listCollectionMedia();
  }

  @Post("collections-media")
  linkCollectionMedia(@Body("media") media: string, @Body("collectionId") collectionId: string) {
    return this.service.linkCollectionMedia(media, collectionId);
  }

  @Delete("collections-media")
  unlinkCollectionMedia(@Query("media") media: string, @Query("collectionId") collectionId: string) {
    return this.service.unlinkCollectionMedia(media, collectionId);
  }

  /* ---- groups-media ---- */
  @Get("groups-media")
  listGroupMedia() {
    return this.service.listGroupMedia();
  }

  @Post("groups-media")
  linkGroupMedia(@Body("media") media: string, @Body("groupId") groupId: string) {
    return this.service.linkGroupMedia(media, groupId);
  }

  @Delete("groups-media")
  unlinkGroupMedia(@Query("media") media: string, @Query("groupId") groupId: string) {
    return this.service.unlinkGroupMedia(media, groupId);
  }

  /* ---- bulk ---- */
  @Post("tags-media/bulk")
  bulkLinkTags(@Body("fileIds") fileIds: string[], @Body("tagIds") tagIds: string[]) {
    return this.service.bulkLinkTags(fileIds, tagIds);
  }

  @Post("collections-media/bulk")
  bulkLinkCollections(@Body("fileIds") fileIds: string[], @Body("collectionIds") collectionIds: string[]) {
    return this.service.bulkLinkCollections(fileIds, collectionIds);
  }

  @Post("groups-media/bulk")
  bulkLinkGroups(@Body("fileIds") fileIds: string[], @Body("groupIds") groupIds: string[]) {
    return this.service.bulkLinkGroups(fileIds, groupIds);
  }
}
