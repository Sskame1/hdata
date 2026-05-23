import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { S3Service } from '../storage/s3.service';
import { PrismaService } from '../database/database.service';

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska', m4v: 'video/mp4', ts: 'video/mp2t',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

@Controller('media')
export class MediaController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  @Get('*path')
  async getFile(
    @Param('path') pathParam: string | string[],
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    let s3Key = path;

    if (!path.includes('/') && !path.startsWith('tmp')) {
      const file = await this.prisma.file.findUnique({ where: { filename: path } });
      if (file) {
        s3Key = file.storageKey;
      }
    }

    await this.streamFromS3(s3Key, req, res);
  }

  private async streamFromS3(key: string, req: Request, res: Response) {
    const ext = key.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const rangeHeader = req.headers.range;

    try {
      if (rangeHeader) {
        const meta = await this.s3Service.getObjectMetadata(key);
        if (!meta) return res.status(404).send('File not found');

        const fileSize = meta.size;
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).send();
        }

        const chunkSize = end - start + 1;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.statusCode = 206;

        const stream = await this.s3Service.getObjectStream(key, `bytes=${start}-${end}`);
        stream.pipe(res);
      } else {
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.statusCode = 200;

        const stream = await this.s3Service.getObjectStream(key);
        stream.pipe(res);
      }
    } catch {
      if (!res.headersSent) res.status(404).send('File not found');
    }
  }
}
