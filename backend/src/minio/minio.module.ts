/* Глобальный модуль — MinioService доступен во всех модулях без импорта */
import { Global, Module } from "@nestjs/common";
import { MinioService } from "./minio.service";

@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
