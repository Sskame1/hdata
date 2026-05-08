import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadsController } from './upload.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [UploadsController],
  providers: [UploadService],
})
export class UploadModule {}
