import { Module } from "@nestjs/common";
import { MangaController } from "./manga.controller";
import { MangaService } from "./manga.service";
import { MinioModule } from "../minio/minio.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [MinioModule, PrismaModule],
  controllers: [MangaController],
  providers: [MangaService],
})
export class MangaModule {}
