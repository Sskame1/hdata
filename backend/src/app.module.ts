import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [UploadModule, MediaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
