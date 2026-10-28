import { Controller, Get, Post, Delete, Body, Param, Query, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, NotFoundException, Res, Header } from "@nestjs/common";
import { AnyFilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { MangaService } from "./manga.service";
import { CreateMangaDto, CreateChapterDto } from "./dto/create-manga.dto";
import { Response } from "express";

@Controller("manga")
export class MangaController {
  constructor(private readonly service: MangaService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.get(id);
  }

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  create(
    @Body() dto: CreateMangaDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let coverFile: Express.Multer.File | undefined;
    const chapters: Express.Multer.File[] = [];
    if (files) {
      for (const f of files) {
        if (f.fieldname === "cover") coverFile = f;
        else if (f.fieldname === "chapters" || f.fieldname === "files") chapters.push(f);
      }
    }
    return this.service.create(dto, coverFile, chapters.length > 0 ? chapters : undefined);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }

  @Post(":id/cover")
  @UseInterceptors(FileInterceptor("file"))
  uploadCover(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.service.uploadCover(id, file);
  }

  @Post(":id/regenerate-cover")
  regenerateCover(@Param("id") id: string, @Query("page") page?: string) {
    return this.service.regenerateCover(id, page ? parseInt(page) : undefined);
  }

  @Post(":id/chapters")
  @UseInterceptors(FileInterceptor("file"))
  async addChapter(
    @Param("id") id: string,
    @Body() dto: CreateChapterDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.service.addChapter(id, dto.chapterNumber, dto.title, file, dto.pageCount);
  }

  @Delete(":id/chapters/:chapterId")
  deleteChapter(@Param("id") id: string, @Param("chapterId") chapterId: string) {
    return this.service.deleteChapter(id, chapterId);
  }

  @Get(":id/cover")
  @Header("Content-Type", "image/jpeg")
  async getCover(@Param("id") id: string, @Res() res: Response) {
    const result = await this.service.getCoverStream(id);
    if (!result) {
      res.status(404).json({ error: "No cover" });
      return;
    }
    result.stream.pipe(res);
  }

  @Get(":id/chapters/:chapterId/pdf")
  @Header("Content-Type", "application/pdf")
  async getPdf(@Param("id") id: string, @Param("chapterId") chapterId: string, @Res() res: Response) {
    const { stream, filename } = await this.service.getChapterPdf(id, chapterId);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    stream.pipe(res);
  }
}
