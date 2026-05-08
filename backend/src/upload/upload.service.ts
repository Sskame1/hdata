import { Injectable } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmdirSync,
} from 'fs';
import { join, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { S3Service } from '../storage/s3.service';

const execAsync = promisify(exec);
const API_URL = process.env.API_URL || 'http://localhost:3001';
let fileCounter = 0;

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

interface FileTags {
  [filename: string]: string[];
}

interface FileCollections {
  [filename: string]: string;
}

export interface Settings {
  STEALTH_MODE: boolean;
}

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly tagsFile = join(process.cwd(), 'uploads', 'tags.json');
  private readonly fileTagsFile = join(
    process.cwd(),
    'uploads',
    'file-tags.json',
  );
  private readonly settingsFile = join(
    process.cwd(),
    'uploads',
    'settings.json',
  );
  private readonly collectionsFile = join(
    process.cwd(),
    'uploads',
    'collections.json',
  );
  private readonly fileCollectionsFile = join(
    process.cwd(),
    'uploads',
    'file-collections.json',
  );

  constructor(private readonly s3Service: S3Service) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private readTagsFile(): Tag[] {
    if (existsSync(this.tagsFile)) {
      try {
        const data = readFileSync(this.tagsFile, 'utf-8');
        return JSON.parse(data) as Tag[];
      } catch {
        return [];
      }
    }
    return [];
  }

  private writeTagsFile(tags: Tag[]): void {
    writeFileSync(this.tagsFile, JSON.stringify(tags, null, 2));
  }

  private readFileTagsFile(): FileTags {
    if (existsSync(this.fileTagsFile)) {
      try {
        const data = readFileSync(this.fileTagsFile, 'utf-8');
        return JSON.parse(data) as FileTags;
      } catch {
        return {};
      }
    }
    return {};
  }

  private writeFileTagsFile(fileTags: FileTags): void {
    writeFileSync(this.fileTagsFile, JSON.stringify(fileTags, null, 2));
  }

  private readSettingsFile(): Settings {
    if (existsSync(this.settingsFile)) {
      try {
        const data = readFileSync(this.settingsFile, 'utf-8');
        return JSON.parse(data) as Settings;
      } catch {
        return { STEALTH_MODE: false };
      }
    }
    return { STEALTH_MODE: false };
  }

  private writeSettingsFile(settings: Settings): void {
    writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2));
  }

  private readCollectionsFile(): Collection[] {
    if (existsSync(this.collectionsFile)) {
      try {
        const data = readFileSync(this.collectionsFile, 'utf-8');
        return JSON.parse(data) as Collection[];
      } catch {
        return [];
      }
    }
    return [];
  }

  private writeCollectionsFile(collections: Collection[]): void {
    writeFileSync(this.collectionsFile, JSON.stringify(collections, null, 2));
  }

  private readFileCollectionsFile(): FileCollections {
    if (existsSync(this.fileCollectionsFile)) {
      try {
        const data = readFileSync(this.fileCollectionsFile, 'utf-8');
        return JSON.parse(data) as FileCollections;
      } catch {
        return {};
      }
    }
    return {};
  }

  private writeFileCollectionsFile(fileCollections: FileCollections): void {
    writeFileSync(
      this.fileCollectionsFile,
      JSON.stringify(fileCollections, null, 2),
    );
  }

  getCollections(): Collection[] {
    return this.readCollectionsFile();
  }

  saveCollections(collections: Collection[]): { success: boolean } {
    const existingCollections = this.readCollectionsFile();

    if (!this.s3Service.enabled) {
      collections.forEach((col) => {
        const colDir = join(this.uploadDir, col.id);
        if (!existsSync(colDir)) {
          mkdirSync(colDir, { recursive: true });
        }
      });

      existingCollections.forEach((oldCol) => {
        const stillExists = collections.find((c) => c.id === oldCol.id);
        if (!stillExists) {
          const colDir = join(this.uploadDir, oldCol.id);
          if (existsSync(colDir)) {
            this.moveCollectionFilesBack(oldCol.id);
            this.removeDir(colDir);
          }
        }
      });
    }

    this.writeCollectionsFile(collections);
    return { success: true };
  }

  private moveCollectionFilesBack(collectionId: string): void {
    const colDir = join(this.uploadDir, collectionId);
    if (!existsSync(colDir)) return;

    const fileCollections = this.readFileCollectionsFile();

    try {
      const files = readdirSync(colDir);
      files.forEach((file) => {
        const oldPath = join(colDir, file);
        const newPath = join(this.uploadDir, file);

        if (existsSync(newPath)) {
          unlinkSync(oldPath);
        } else {
          renameSync(oldPath, newPath);
        }
      });

      Object.keys(fileCollections).forEach((filename) => {
        if (fileCollections[filename] === collectionId) {
          delete fileCollections[filename];
        }
      });
      this.writeFileCollectionsFile(fileCollections);
    } catch (err) {
      console.error('Error moving files back:', err);
    }
  }

  private removeDir(dir: string): void {
    try {
      const files = readdirSync(dir);
      files.forEach((file) => unlinkSync(join(dir, file)));
      rmdirSync(dir);
    } catch (err) {
      console.error('Error removing directory:', err);
    }
  }

  getSettings(): Settings {
    return this.readSettingsFile();
  }

  saveSettings(settings: Settings): { success: boolean } {
    this.writeSettingsFile(settings);
    return { success: true };
  }

  async saveFile(file: Express.Multer.File) {
    const timestamp = Date.now();
    fileCounter++;
    const ext = extname(file.originalname);
    const filename = `${timestamp}-${fileCounter}${ext}`;

    const isVideoFile =
      file.mimetype.startsWith('video/') ||
      !!filename.match(/\.(mp4|webm|mov|avi|mkv)$/i);

    if (this.s3Service.enabled) {
      await this.s3Service.putObject(filename, file.buffer, file.mimetype);
    } else {
      writeFileSync(join(this.uploadDir, filename), file.buffer);
    }

    const result = {
      id: filename.replace(/\.[^/.]+$/, ''),
      url: `${API_URL}/media/${filename}`,
      thumbnailUrl: isVideoFile
        ? `${API_URL}/media/${filename.replace(/\.[^/.]+$/, '')}.jpg`
        : null,
      isVideoThumbnail: false,
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      tags: [],
      collection: null,
    };

    if (isVideoFile) {
      void this.generateThumbnail(filename, file.buffer);
    }

    return result;
  }

  async generateThumbnail(videoFilename: string, buffer?: Buffer) {
    const thumbFilename = videoFilename.replace(/\.[^/.]+$/, '') + '.jpg';

    if (this.s3Service.enabled && buffer) {
      const tmpDir = join(this.uploadDir, 'tmp');
      if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true });
      }
      const tmpVideo = join(tmpDir, videoFilename);
      const tmpThumb = join(tmpDir, thumbFilename);
      writeFileSync(tmpVideo, buffer);
      try {
        const cmd = `ffmpeg -i "${tmpVideo}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${tmpThumb}" -y`;
        await execAsync(cmd);
        const thumbBuffer = readFileSync(tmpThumb);
        await this.s3Service.putObject(
          thumbFilename,
          thumbBuffer,
          'image/jpeg',
        );
        console.log('Thumbnail generated on S3:', thumbFilename);
      } catch (err) {
        console.error('Thumbnail error:', err);
      } finally {
        if (existsSync(tmpVideo)) unlinkSync(tmpVideo);
        if (existsSync(tmpThumb)) unlinkSync(tmpThumb);
      }
    } else {
      const videoPath = join(this.uploadDir, videoFilename);
      const thumbPath = join(this.uploadDir, thumbFilename);
      try {
        const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${thumbPath}" -y`;
        await execAsync(cmd);
        console.log('Thumbnail generated:', thumbFilename);
      } catch (err) {
        console.error('Thumbnail error:', err);
      }
    }
  }

  async getAllFiles() {
    if (this.s3Service.enabled) {
      return this.getAllFilesS3();
    }

    if (!existsSync(this.uploadDir)) {
      return [];
    }

    const fileTags = this.readFileTagsFile();
    const fileCollections = this.readFileCollectionsFile();
    const allFiles: string[] = [];

    const rootFiles = readdirSync(this.uploadDir).filter((f) => {
      const stat = statSync(join(this.uploadDir, f));
      return stat.isFile() && !f.endsWith('.json');
    });
    allFiles.push(...rootFiles);

    const subdirs = readdirSync(this.uploadDir).filter((f) => {
      const stat = statSync(join(this.uploadDir, f));
      return (
        stat.isDirectory() &&
        ![
          'tags.json',
          'file-tags.json',
          'settings.json',
          'collections.json',
          'file-collections.json',
        ].includes(f)
      );
    });

    subdirs.forEach((subdir) => {
      const subFiles = readdirSync(join(this.uploadDir, subdir)).filter(
        (f) => !f.endsWith('.json'),
      );
      allFiles.push(...subFiles);
    });

    return allFiles
      .map((filename) => {
        let collectionId: string | null = fileCollections[filename] || null;
        if (!collectionId) {
          const parentDir = readdirSync(this.uploadDir).find((d) => {
            try {
              return statSync(join(this.uploadDir, d, filename)).isFile();
            } catch {
              return false;
            }
          });
          collectionId =
            parentDir &&
            ![
              'tags.json',
              'file-tags.json',
              'settings.json',
              'collections.json',
              'file-collections.json',
            ].includes(parentDir)
              ? parentDir
              : null;
        }

        const filePath = collectionId
          ? join(this.uploadDir, collectionId, filename)
          : join(this.uploadDir, filename);

        if (!existsSync(filePath)) {
          return null;
        }

        const stats = statSync(filePath);
        const namePart = filename.substring(filename.indexOf('-') + 1);
        const originalName = namePart.includes('-')
          ? namePart.substring(namePart.indexOf('-') + 1)
          : namePart;

        const isVideo = !!filename.match(/\.(mp4|webm|mov|avi|mkv)$/i);
        const thumbFilename = isVideo
          ? filename.replace(/\.[^/.]+$/, '') + '.jpg'
          : null;

        const thumbFileExists =
          thumbFilename &&
          (collectionId
            ? existsSync(join(this.uploadDir, collectionId, thumbFilename))
            : existsSync(join(this.uploadDir, thumbFilename)));
        const finalThumbUrl = thumbFileExists
          ? collectionId
            ? `${API_URL}/media/${collectionId}/${thumbFilename}`
            : `${API_URL}/media/${thumbFilename}`
          : null;

        return {
          id: filename.replace(/\.[^/.]+$/, ''),
          url: collectionId
            ? `${API_URL}/media/${collectionId}/${filename}`
            : `${API_URL}/media/${filename}`,
          thumbnailUrl: finalThumbUrl,
          isVideoThumbnail: false,
          filename,
          originalName: originalName || filename,
          mimetype: this.getMimeType(filename),
          size: stats.size,
          createdAt: stats.birthtime,
          tags: fileTags[filename] || [],
          collection: collectionId,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  private async getAllFilesS3() {
    const objects = await this.s3Service.listObjects();
    const fileTags = this.readFileTagsFile();

    const mediaObjects = objects.filter(
      (o) => !o.key.endsWith('.json') && !o.key.startsWith('tmp/'),
    );

    return mediaObjects
      .map((obj) => {
        const parts = obj.key.split('/');
        const filename = parts.length > 1 ? parts[1] : parts[0];
        const collectionId = parts.length > 1 ? parts[0] : null;

        const isVideo = !!filename.match(/\.(mp4|webm|mov|avi|mkv)$/i);
        const thumbFilename = isVideo
          ? filename.replace(/\.[^/.]+$/, '') + '.jpg'
          : null;
        const thumbKey = collectionId
          ? `${collectionId}/${thumbFilename}`
          : thumbFilename;
        const thumbExists =
          thumbFilename && mediaObjects.some((o) => o.key === thumbKey);

        const namePart = filename.substring(filename.indexOf('-') + 1);
        const originalName = namePart.includes('-')
          ? namePart.substring(namePart.indexOf('-') + 1)
          : namePart;

        return {
          id: filename.replace(/\.[^/.]+$/, ''),
          url: collectionId
            ? `${API_URL}/media/${collectionId}/${filename}`
            : `${API_URL}/media/${filename}`,
          thumbnailUrl: thumbExists
            ? collectionId
              ? `${API_URL}/media/${collectionId}/${thumbFilename}`
              : `${API_URL}/media/${thumbFilename}`
            : null,
          isVideoThumbnail: false,
          filename,
          originalName: originalName || filename,
          mimetype: this.getMimeType(filename),
          size: obj.size,
          createdAt: obj.lastModified,
          tags: fileTags[filename] || [],
          collection: collectionId,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async deleteFile(filename: string): Promise<boolean> {
    if (this.s3Service.enabled) {
      return this.deleteFileS3(filename);
    }

    try {
      const filePath = join(this.uploadDir, filename);
      if (existsSync(filePath)) {
        unlinkSync(filePath);

        const fileTags = this.readFileTagsFile();
        if (fileTags[filename]) {
          const tags = this.readTagsFile();
          const deletedTags = fileTags[filename];

          deletedTags.forEach((tagName) => {
            const tag = tags.find((t) => t.name === tagName);
            if (tag && tag.count > 0) {
              tag.count--;
            }
          });
          this.writeTagsFile(tags);

          delete fileTags[filename];
          this.writeFileTagsFile(fileTags);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async deleteFileS3(filename: string): Promise<boolean> {
    const thumbFilename = filename.replace(/\.[^/.]+$/, '') + '.jpg';

    try {
      const keysToDelete = [filename, thumbFilename];
      const fileCollections = this.readFileCollectionsFile();
      const collectionId = fileCollections[filename];
      if (collectionId) {
        keysToDelete.push(`${collectionId}/${filename}`);
        keysToDelete.push(`${collectionId}/${thumbFilename}`);
      }

      for (const key of keysToDelete) {
        try {
          await this.s3Service.deleteObject(key);
        } catch {
          /* key may not exist */
        }
      }

      const fileTags = this.readFileTagsFile();
      if (fileTags[filename]) {
        const tags = this.readTagsFile();
        const deletedTags = fileTags[filename];

        deletedTags.forEach((tagName) => {
          const tag = tags.find((t) => t.name === tagName);
          if (tag && tag.count > 0) {
            tag.count--;
          }
        });
        this.writeTagsFile(tags);

        delete fileTags[filename];
        this.writeFileTagsFile(fileTags);
      }

      return true;
    } catch {
      return false;
    }
  }

  getTags(): Tag[] {
    return this.readTagsFile();
  }

  saveTags(tags: Tag[]): { success: boolean } {
    this.writeTagsFile(tags);
    return { success: true };
  }

  updateFileTags(filename: string, newTags: string[]): { success: boolean } {
    try {
      const fileTags = this.readFileTagsFile();
      const oldTags = fileTags[filename] || [];

      const tags = this.readTagsFile();

      oldTags.forEach((tagName) => {
        const tag = tags.find((t) => t.name === tagName);
        if (tag && tag.count > 0) {
          tag.count--;
        }
      });

      newTags.forEach((tagName) => {
        let tag = tags.find((t) => t.name === tagName);
        if (!tag) {
          tag = {
            id: Date.now().toString(),
            name: tagName,
            color: '#888888',
            count: 0,
          };
          tags.push(tag);
        }
        tag.count++;
      });

      this.writeTagsFile(tags);
      fileTags[filename] = newTags;
      this.writeFileTagsFile(fileTags);

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mov: 'video/quicktime',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      txt: 'text/plain',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      ts: 'application/typescript',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      webm: 'video/webm',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private getThumbnailFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '') + '.jpg';
  }

  async updateFileCollection(
    filename: string,
    collectionId: string | null,
  ): Promise<{ success: boolean }> {
    try {
      const fileCollections = this.readFileCollectionsFile();
      const currentCollection = fileCollections[filename] || null;
      const thumbFilename = this.getThumbnailFilename(filename);

      if (this.s3Service.enabled) {
        return this.updateFileCollectionS3(
          filename,
          collectionId,
          currentCollection,
          thumbFilename,
          fileCollections,
        );
      }

      if (collectionId) {
        const sourcePath = join(
          this.uploadDir,
          currentCollection || '',
          filename,
        );
        const sourceThumbPath = join(
          this.uploadDir,
          currentCollection || '',
          thumbFilename,
        );
        const targetDir = join(this.uploadDir, collectionId);

        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = join(targetDir, filename);
        const targetThumbPath = join(targetDir, thumbFilename);

        if (existsSync(sourcePath) && sourcePath !== targetPath) {
          renameSync(sourcePath, targetPath);

          if (existsSync(sourceThumbPath)) {
            renameSync(sourceThumbPath, targetThumbPath);
          }

          if (currentCollection) {
            const oldDir = join(this.uploadDir, currentCollection);
            if (existsSync(oldDir)) {
              const files = readdirSync(oldDir);
              if (files.length === 0) {
                rmdirSync(oldDir);
              }
            }
          }
        }

        fileCollections[filename] = collectionId;
      } else if (currentCollection) {
        const sourcePath = join(this.uploadDir, currentCollection, filename);
        const sourceThumbPath = join(
          this.uploadDir,
          currentCollection,
          thumbFilename,
        );
        const targetPath = join(this.uploadDir, filename);
        const targetThumbPath = join(this.uploadDir, thumbFilename);

        if (existsSync(sourcePath)) {
          renameSync(sourcePath, targetPath);

          if (existsSync(sourceThumbPath)) {
            renameSync(sourceThumbPath, targetThumbPath);
          }

          const oldDir = join(this.uploadDir, currentCollection);
          if (existsSync(oldDir)) {
            const files = readdirSync(oldDir);
            if (files.length === 0) {
              rmdirSync(oldDir);
            }
          }
        }

        delete fileCollections[filename];
      }

      this.writeFileCollectionsFile(fileCollections);
      return { success: true };
    } catch (err) {
      console.error('Error updating file collection:', err);
      return { success: false };
    }
  }

  private async updateFileCollectionS3(
    filename: string,
    collectionId: string | null,
    currentCollection: string | null,
    thumbFilename: string,
    fileCollections: FileCollections,
  ): Promise<{ success: boolean }> {
    const sourceKey = currentCollection
      ? `${currentCollection}/${filename}`
      : filename;
    const sourceThumbKey = currentCollection
      ? `${currentCollection}/${thumbFilename}`
      : thumbFilename;

    if (collectionId) {
      const targetKey = `${collectionId}/${filename}`;
      const targetThumbKey = `${collectionId}/${thumbFilename}`;

      if (sourceKey !== targetKey) {
        await this.s3Service.copyObject(sourceKey, targetKey);

        if (await this.s3Service.exists(sourceThumbKey)) {
          await this.s3Service.copyObject(sourceThumbKey, targetThumbKey);
        }

        fileCollections[filename] = collectionId;
        this.writeFileCollectionsFile(fileCollections);

        await this.s3Service.deleteObject(sourceKey).catch(() => {});
        if (await this.s3Service.exists(sourceThumbKey)) {
          await this.s3Service.deleteObject(sourceThumbKey).catch(() => {});
        }
      } else {
        fileCollections[filename] = collectionId;
        this.writeFileCollectionsFile(fileCollections);
      }
    } else if (currentCollection) {
      await this.s3Service.copyObject(sourceKey, filename);

      if (await this.s3Service.exists(sourceThumbKey)) {
        await this.s3Service.copyObject(sourceThumbKey, thumbFilename);
      }

      delete fileCollections[filename];
      this.writeFileCollectionsFile(fileCollections);

      await this.s3Service.deleteObject(sourceKey).catch(() => {});
      if (await this.s3Service.exists(sourceThumbKey)) {
        await this.s3Service.deleteObject(sourceThumbKey).catch(() => {});
      }
    } else {
      this.writeFileCollectionsFile(fileCollections);
    }

    return { success: true };
  }

  private computeHash(filename: string): string {
    try {
      const filePath = join(this.uploadDir, filename);
      if (!existsSync(filePath)) {
        return `${filename}-deleted`;
      }
      const stat = statSync(filePath);
      return `${filename}-${stat.size}-${stat.mtimeMs}`;
    } catch {
      return `${filename}-missing`;
    }
  }

  async getSyncData() {
    const allFiles = await this.getAllFiles();
    const files = allFiles.filter((f) => {
      if (this.s3Service.enabled) return true;
      const filePath = join(this.uploadDir, f.filename);
      return existsSync(filePath);
    });
    const fileTags = this.readFileTagsFile();
    const fileCollections = this.readFileCollectionsFile();

    return {
      files: files.map((f) => ({
        filename: f.filename,
        originalName: f.originalName,
        mimetype: f.mimetype,
        size: f.size,
        tags: fileTags[f.filename] || [],
        collection: fileCollections[f.filename] || null,
        hash: this.computeHash(f.filename),
      })),
      tags: this.getTags(),
      collections: this.readCollectionsFile(),
    };
  }

  async syncFiles(
    syncData: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      tags?: string[];
      collection?: string | null;
      hash: string;
    }[],
  ) {
    const existingFiles = await this.getAllFiles();
    const existingHashes = new Map(
      existingFiles.map((f) => [f.filename, this.computeHash(f.filename)]),
    );
    const result = { added: [] as string[], updated: [] as string[] };

    for (const file of syncData) {
      if (!existingHashes.has(file.filename)) {
        result.added.push(file.filename);
      } else if (existingHashes.get(file.filename) !== file.hash) {
        result.updated.push(file.filename);
      }
    }

    return result;
  }
}
