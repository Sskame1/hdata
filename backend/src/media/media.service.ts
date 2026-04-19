import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class MediaService {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  getFileStream(filename: string) {
    const filePath = join(this.uploadDir, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return createReadStream(filePath);
  }
}
