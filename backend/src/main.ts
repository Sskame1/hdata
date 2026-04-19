import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(
    '/media',
    express.static(join(process.cwd(), 'uploads'), {
      setHeaders: (res, filepath) => {
        res.set('Accept-Ranges', 'bytes');
        const ext = filepath.split('.').pop()?.toLowerCase();
        if (ext && MIME_TYPES[ext]) {
          res.set('Content-Type', MIME_TYPES[ext]);
        }
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
  console.log(
    `Backend running on http://localhost:${process.env.PORT ?? 3001}`,
  );
}
void bootstrap();
