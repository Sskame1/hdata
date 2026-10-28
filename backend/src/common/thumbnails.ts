/* Генерация превью.
   img: sharp resize 300×300 → JPEG
   gif: sharp(animated: false) первый кадр → JPEG
   video: fluent-ffmpeg screenshots → JPEG + ffprobe для длительности */
import sharp from "sharp";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { v4 as uuid } from "uuid";
import { Readable } from "stream";
import { MinioService } from "../minio/minio.service";

export async function generateImageThumbnail(
  buffer: Buffer,
  objectKey: string,
  minio: MinioService,
): Promise<string> {
  const thumb = await sharp(buffer)
    .resize(300, 300, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbKey = objectKey.replace(/\.\w+$/, "_thumb.jpg");
  await minio.upload(thumbKey, Readable.from(thumb), thumb.length, "image/jpeg");
  return thumbKey;
}

export async function generateGifThumbnail(
  buffer: Buffer,
  objectKey: string,
  minio: MinioService,
): Promise<string> {
  const thumb = await sharp(buffer, { animated: false })
    .resize(300, 300, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbKey = `gif/thumbnails/${uuid()}.jpg`;
  await minio.upload(thumbKey, Readable.from(thumb), thumb.length, "image/jpeg");
  return thumbKey;
}

export async function generateVideoThumbnail(
  tmpPath: string,
  objectKey: string,
  minio: MinioService,
): Promise<{ thumbnail: string; duration: number }> {
  const ffmpeg = require("fluent-ffmpeg");
  const thumbName = `${uuid()}.jpg`;
  const thumbDir = fs.mkdtempSync(path.join(os.tmpdir(), "hdata-thumb-"));
  const thumbPath = path.join(thumbDir, thumbName);
  const thumbKey = `video/thumbnails/${thumbName}`;

  return new Promise((resolve, reject) => {
    ffmpeg(tmpPath)
      .on("end", async () => {
        try {
          const thumbBuffer = fs.readFileSync(thumbPath);
          await minio.upload(thumbKey, Readable.from(thumbBuffer), thumbBuffer.length, "image/jpeg");
          fs.rmSync(thumbDir, { recursive: true });
        } catch (e) {
          fs.rmSync(thumbDir, { recursive: true });
          reject(e);
          return;
        }
        const duration = await getVideoDuration(tmpPath);
        resolve({ thumbnail: thumbKey, duration });
      })
      .on("error", (err: Error) => {
        fs.rmSync(thumbDir, { recursive: true });
        reject(err);
      })
      .screenshots({
        count: 1,
        filename: thumbName,
        folder: thumbDir,
        size: "300x?",
      });
  });
}

/* Получение длительности видео через ffprobe */
function getVideoDuration(filePath: string): Promise<number> {
  const ffmpeg = require("fluent-ffmpeg");
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, data: any) => {
      if (err) return reject(err);
      resolve(Math.round(data.format.duration ?? 0));
    });
  });
}
