import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

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
  @Get(':collection/:filename')
  getFileFromCollection(
    @Param('collection') collection: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
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
  getFile(@Param('filename') filename: string, @Res() res: Response) {
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
}
