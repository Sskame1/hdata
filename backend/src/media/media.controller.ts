import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { S3Service } from '../storage/s3.service';

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

@Controller('media')
export class MediaController {
  constructor(private readonly s3Service: S3Service) {}

  @Get(':collection/:filename')
  async getFileFromCollection(
    @Param('collection') collection: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (this.s3Service.enabled) {
      return this.streamFromS3(`${collection}/${filename}`, res);
    }

    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const uploadDir = join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, collection, filename);

    if (!existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stats = statSync(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Range', `bytes 0-${stats.size - 1}/${stats.size}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.statusCode = 200;

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  @Get(':filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    if (this.s3Service.enabled) {
      return this.streamFromS3(filename, res);
    }

    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const uploadDir = join(process.cwd(), 'uploads');

    let filePath = join(uploadDir, filename);
    if (!existsSync(filePath)) {
      const subdirs = readdirSync(uploadDir).filter((d) => {
        const stat = statSync(join(uploadDir, d));
        return stat.isDirectory();
      });
      for (const subdir of subdirs) {
        const testPath = join(uploadDir, subdir, filename);
        if (existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }
    }

    if (!existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stats = statSync(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Range', `bytes 0-${stats.size - 1}/${stats.size}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.statusCode = 200;

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }

  private async streamFromS3(key: string, res: Response) {
    try {
      const stream = await this.s3Service.getObjectStream(key);
      const ext = key.split('.').pop()?.toLowerCase() || '';
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.statusCode = 200;

      stream.on('error', (err) => {
        console.error('S3 stream error for', key, err);
        if (!res.headersSent) {
          res.status(500).send('Stream error');
        }
      });

      stream.pipe(res);
    } catch (err) {
      console.error('S3 getObjectStream error for', key, err);
      if (!res.headersSent) {
        res.status(404).send('File not found');
      }
    }
  }
}
