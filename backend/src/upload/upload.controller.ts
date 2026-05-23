import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Delete,
  Param,
  Body,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2000 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.saveFile(file);
  }

  @Get()
  getAllFiles() {
    return this.uploadsService.getAllFiles();
  }

  @Delete(':filename')
  async deleteFile(@Param('filename') filename: string) {
    const deleted = await this.uploadsService.deleteFile(filename);
    return { success: deleted };
  }

  @Get('tags')
  getTags() {
    return this.uploadsService.getTags();
  }

  @Put('tags')
  updateTags(
    @Body()
    body: {
      tags: { id: string; name: string; color: string; count: number }[];
    },
  ) {
    return this.uploadsService.saveTags(body.tags);
  }

  @Put(':filename/tags')
  updateFileTags(
    @Param('filename') filename: string,
    @Body() body: { tags: string[] },
  ) {
    return this.uploadsService.updateFileTags(filename, body.tags);
  }

  @Get('sync')
  async getSyncData() {
    return this.uploadsService.getSyncData();
  }

  @Post('sync')
  async syncFiles(
    @Body()
    body: {
      files: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        tags?: string[];
        collection?: string | null;
        hash: string;
      }[];
    },
  ) {
    return this.uploadsService.syncFiles(body.files);
  }

  @Get('settings')
  getSettings() {
    return this.uploadsService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() body: { STEALTH_MODE: boolean }) {
    return this.uploadsService.saveSettings(body);
  }

  @Post('thumbnail/:filename')
  async generateThumbnail(@Param('filename') filename: string) {
    await this.uploadsService.regenerateThumbnailByFilename(filename);
    return { success: true, filename };
  }

  @Get('collections')
  getCollections() {
    return this.uploadsService.getCollections();
  }

  @Put('collections')
  updateCollections(
    @Body()
    body: {
      collections: { id: string; name: string; color: string }[];
    },
  ) {
    return this.uploadsService.saveCollections(body.collections);
  }

  @Put(':filename/collection')
  async updateFileCollection(
    @Param('filename') filename: string,
    @Body() body: { collectionId: string | null },
  ) {
    return this.uploadsService.updateFileCollection(
      filename,
      body.collectionId,
    );
  }
}
