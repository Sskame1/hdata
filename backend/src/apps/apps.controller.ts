/* Контроллер приложений. Multipart create с cover + screenshots + videos + files.
   Все медиафайлы (cover, скриншоты, видео, файлы для скачивания) через MinIO stream. */
import {
  Controller, Get, Post, Delete, Param, Body, UploadedFiles, UseInterceptors, Res,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { AppsService } from "./apps.service";

@Controller("apps")
export class AppsController {
  constructor(private readonly service: AppsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }

  /* Создание приложения: multipart с cover, screenshots, videos, download files */
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "cover", maxCount: 1 },
      { name: "screenshots", maxCount: 20 },
      { name: "videos", maxCount: 10 },
      { name: "files", maxCount: 20 },
    ]),
  )
  create(
    @Body("name") name: string,
    @Body("description") description: string | undefined,
    @Body("version") version: string | undefined,
    @UploadedFiles() uploads: {
      cover?: Express.Multer.File[];
      screenshots?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      files?: Express.Multer.File[];
    },
  ) {
    return this.service.create(
      name,
      description,
      version,
      uploads?.cover?.[0],
      uploads?.screenshots ?? [],
      uploads?.videos ?? [],
      uploads?.files ?? [],
    );
  }

  @Get(":id/download/:downloadId")
  async download(@Param("id") id: string, @Param("downloadId") downloadId: string, @Res() res: Response) {
    const { stream, name, size } = await this.service.downloadFile(id, downloadId);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    if (size) res.setHeader("Content-Length", Number(size));
    stream.pipe(res);
  }

  /* Скриншот/видео приложения (stream из MinIO) */
  @Get(":id/media/:type/:mediaId")
  async media(@Param("id") id: string, @Param("type") type: string, @Param("mediaId") mediaId: string, @Res() res: Response) {
    const stream = await this.service.getMedia(id, type as "screenshots" | "videos", mediaId);
    stream.pipe(res);
  }

  /* Обложка приложения (stream из MinIO) */
  @Get(":id/cover")
  async cover(@Param("id") id: string, @Res() res: Response) {
    const stream = await this.service.getCover(id);
    stream.pipe(res);
  }
}
