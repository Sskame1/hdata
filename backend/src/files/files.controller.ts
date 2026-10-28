/* Контроллер файлов. Все эндпоинты /files/*.
   Upload принимает multipart (10GB лимит), thumbnail/download отдают stream из MinIO. */
import {
  Controller, Get, Post, Delete, Param, Query, UploadedFile, UseInterceptors, Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { FilesService } from "./files.service";

@Controller("files")
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Get()
  list(
    @Query("type") type?: string,
    @Query("tagIds") tagIds?: string,
    @Query("collectionIds") collectionIds?: string,
  ) {
    return this.service.list({ type, tagIds, collectionIds });
  }

  @Get("storage-stats")
  storageStats() {
    return this.service.storageStats();
  }

  @Get("cache-stats")
  cacheStats() {
    return this.service.cacheStats();
  }

  @Post("clear-cache")
  clearCache() {
    return this.service.clearCache();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }

  /* Upload файла. Лимит 10GB. Тип определяется из query (img/gif/video). */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 ** 3 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query("type") type: string,
  ) {
    if (!file) throw new Error("File is required");
    return this.service.upload(file, type ?? "img");
  }

  @Get(":id/thumbnail")
  async thumbnail(@Param("id") id: string, @Res() res: Response) {
    const stream = await this.service.getThumbnail(id);
    stream.pipe(res);
  }

  /* Скачивание файла. Кэширует локально, отдаёт с filename и Accept-Ranges. */
  @Get(":id/download")
  async download(@Param("id") id: string, @Res() res: Response) {
    const { localPath, file } = await this.service.getLocalPath(id);
    res.sendFile(localPath, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  @Post(":id/reprocess")
  async reprocess(@Param("id") id: string, @Query("transcode") transcode?: string) {
    return this.service.reprocess(id, transcode === "true");
  }

  @Post("regenerate-thumbnails")
  regenerateThumbnails() {
    return this.service.regenerateThumbnails();
  }

  @Post("sync-from-storage")
  syncFromStorage() {
    return this.service.syncFromStorage();
  }
}
