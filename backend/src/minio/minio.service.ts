/* Обёртка над MinIO Client. Создаёт bucket при инициализации.
   Все методы работают с bucket из MINIO_BUCKET (по умолчанию hdata). */
import { Injectable, OnModuleInit } from "@nestjs/common";
import * as Minio from "minio";
import { Readable } from "stream";

const BUCKET = process.env.MINIO_BUCKET ?? "hdata";

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    });
  }

  /* Создать bucket, если не существует */
  async onModuleInit() {
    const exists = await this.client.bucketExists(BUCKET);
    if (!exists) await this.client.makeBucket(BUCKET, "us-east-1");
  }

  async upload(objectKey: string, stream: Readable, size: number, mimeType: string) {
    await this.client.putObject(BUCKET, objectKey, stream, size, { "Content-Type": mimeType });
  }

  async uploadBuffer(objectKey: string, buffer: Buffer, mimeType: string) {
    await this.client.putObject(BUCKET, objectKey, buffer, buffer.length, { "Content-Type": mimeType });
  }

  async download(objectKey: string): Promise<Readable> {
    return this.client.getObject(BUCKET, objectKey);
  }

  async getBuffer(objectKey: string): Promise<Buffer> {
    const stream = await this.download(objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async downloadRange(objectKey: string, start: number, end?: number) {
    return this.client.getObject(BUCKET, objectKey, { start, end } as any);
  }

  async stat(objectKey: string) {
    return this.client.statObject(BUCKET, objectKey);
  }

  async remove(objectKey: string) {
    await this.client.removeObject(BUCKET, objectKey);
  }

  /* Рекурсивный список всех объектов с префиксом */
  async list(prefix: string): Promise<string[]> {
    const objects: string[] = [];
    const stream = this.client.listObjects(BUCKET, prefix, true);
    for await (const obj of stream) {
      if (obj.name) objects.push(obj.name);
    }
    return objects;
  }

  getUrl(objectKey: string): string {
    const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
    const port = process.env.MINIO_PORT ?? 9000;
    const useSSL = process.env.MINIO_USE_SSL === "true";
    const protocol = useSSL ? "https" : "http";
    return `${protocol}://${endpoint}:${port}/${BUCKET}/${objectKey}`;
  }
}
