import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadsController } from './upload.controller';

@Module({
  controllers: [UploadsController],
  providers: [UploadService],
})
export class UploadModule {}
