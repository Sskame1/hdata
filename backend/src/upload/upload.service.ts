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
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const API_URL = 'http://172.16.0.2:3001';
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

  constructor() {
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

  saveFile(file: Express.Multer.File) {
    const isVideoFile =
      file.mimetype.startsWith('video/') ||
      !!file.filename.match(/\.(mp4|webm|mov|avi|mkv)$/i);

    const result = {
      id: file.filename.replace(/\.[^/.]+$/, ''),
      url: `${API_URL}/media/${file.filename}`,
      thumbnailUrl: isVideoFile
        ? `${API_URL}/media/${file.filename.replace(/\.[^/.]+$/, '')}.jpg`
        : null,
      isVideoThumbnail: false,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      tags: [],
      collection: null,
    };

    if (isVideoFile) {
      void this.generateThumbnail(file.filename);
    }

    return result;
  }

  async generateThumbnail(videoFilename: string) {
    const videoPath = join(this.uploadDir, videoFilename);
    const thumbFilename = videoFilename.replace(/\.[^/.]+$/, '') + '.jpg';
    const thumbPath = join(this.uploadDir, thumbFilename);

    try {
      const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${thumbPath}" -y`;
      await execAsync(cmd);
      console.log('Thumbnail generated:', thumbFilename);
    } catch (err) {
      console.error('Thumbnail error:', err);
    }
  }

  getAllFiles() {
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

  deleteFile(filename: string): boolean {
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
      mp4: 'video/mp4',
      webm: 'video/webm',
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
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private getThumbnailFilename(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '') + '.jpg';
  }

  updateFileCollection(
    filename: string,
    collectionId: string | null,
  ): { success: boolean } {
    try {
      const fileCollections = this.readFileCollectionsFile();
      const currentCollection = fileCollections[filename];
      const thumbFilename = this.getThumbnailFilename(filename);

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

  getSyncData() {
    const files = this.getAllFiles().filter((f) => {
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

  syncFiles(
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
    const existingFiles = this.getAllFiles();
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
