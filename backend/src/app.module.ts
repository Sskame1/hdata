import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { MediaModule } from './media/media.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, UploadModule, MediaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
