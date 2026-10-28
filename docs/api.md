# HData API

Base URL: `http://localhost:4000`

---

## Статистика

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/stat` | — | `{ counts, distribution, storage }` |

Ответ:
```json
{
  "counts": {
    "files": 100, "images": 50, "gifs": 30, "videos": 20,
    "tags": 10, "collections": 5, "collectionGroups": 8, "apps": 3,
    "dbSizeBytes": 12345678
  },
  "distribution": {
    "filesPerTag": [{ "tagId": "...", "tagName": "...", "tagColor": "#...", "count": 15 }],
    "filesPerCollection": [{ "collectionId": "...", "collectionName": "...", "count": 30 }],
    "filesPerGroup": [{ "groupId": "...", "groupName": "...", "collectionName": "...", "count": 10 }],
    "tagsPerFile": { "min": 0, "max": 5, "avg": 2.3 },
    "collectionsPerFile": { "min": 0, "max": 3, "avg": 1.1 },
    "groupsPerFile": { "min": 0, "max": 4, "avg": 0.8 }
  },
  "storage": { "usedBytes": 1000000, "totalBytes": 5000000, "availableBytes": 4000000 }
}
```

---

## Теги

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/tags` | — | `Tag[]` |
| `POST` | `/tags` | `{ name, color? }` | `Tag` |
| `DELETE` | `/tags?id=` | `id` | `{ ok }` |

## Коллекции

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/collections` | — | `Collection[]` |
| `POST` | `/collections` | `{ name }` | `Collection` |
| `DELETE` | `/collections?id=` | `id` | `{ ok }` |

## Группы коллекций

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/collections/:id/groups` | `id` — коллекция | `CollectionGroup[]` |
| `POST` | `/collections/:id/groups` | `id` — коллекция; `{ name }` | `CollectionGroup` |
| `DELETE` | `/collections/:id/groups/:groupId` | `groupId` — группа | `{ ok }` |

## Файлы

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/files` | `?type=&tagIds=&collectionIds=` | `FileItem[]` |
| `GET` | `/files/:id` | `id` | `FileItem` |
| `DELETE` | `/files/:id` | `id` | `{ ok }` |
| `POST` | `/files/upload?type=` | multipart `file`; `type: img\|gif\|video` | `{ id, path, thumbnail? }` |
| `GET` | `/files/:id/thumbnail` | `id` | stream (image/jpeg) |
| `GET` | `/files/:id/download` | `id` | stream (файл) |
| `POST` | `/files/:id/reprocess` | `?transcode=true` | `{ ok, size, duration }` |
| `POST` | `/files/regenerate-thumbnails` | — | `{ id, filename, status }[]` |
| `POST` | `/files/sync-from-storage` | — | `{ path, status }[]` |
| `GET` | `/files/storage-stats` | — | `{ usedBytes, totalBytes, availableBytes }` |
| `GET` | `/files/cache-stats` | — | `{ sizeBytes, fileCount }` |
| `POST` | `/files/clear-cache` | — | `{ ok }` |

## Связи: теги ↔ файлы

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/tags-media` | — | `TagMedia[]` |
| `POST` | `/tags-media` | `{ media, tagId }` | `{ ok }` |
| `DELETE` | `/tags-media?media=&tagId=` | `media, tagId` | `{ ok }` |
| `POST` | `/tags-media/bulk` | `{ fileIds, tagIds }` | `{ ok, created }` |

## Связи: коллекции ↔ файлы

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/collections-media` | — | `CollectionMedia[]` |
| `POST` | `/collections-media` | `{ media, collectionId }` | `{ ok }` |
| `DELETE` | `/collections-media?media=&collectionId=` | `media, collectionId` | `{ ok }` |
| `POST` | `/collections-media/bulk` | `{ fileIds, collectionIds }` | `{ ok, created }` |

## Связи: группы ↔ файлы

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/groups-media` | — | `FileGroup[]` |
| `POST` | `/groups-media` | `{ media, groupId }` | `{ ok }` |
| `DELETE` | `/groups-media?media=&groupId=` | `media, groupId` | `{ ok }` |
| `POST` | `/groups-media/bulk` | `{ fileIds, groupIds }` | `{ ok, created }` |

## Приложения

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/apps` | — | `App[]` |
| `GET` | `/apps/:id` | `id` | `App` |
| `DELETE` | `/apps/:id` | `id` | `{ ok }` |
| `POST` | `/apps` | multipart: `name`, `description?`, `version?`, `cover`, `screenshots[]`, `videos[]`, `files[]` | `App` |
| `GET` | `/apps/:id/cover` | `id` | stream |
| `GET` | `/apps/:id/download/:downloadId` | `id, downloadId` | stream (скачивание) |
| `GET` | `/apps/:id/media/:type/:mediaId` | `id, type: screenshots\|videos, mediaId` | stream |

## Манга

| Метод | Путь | Параметры | Ответ |
|--------|------|-----------|--------|
| `GET` | `/manga` | — | `Manga[]` (без глав) |
| `GET` | `/manga/:id` | `id` | `Manga` с `chapters[]` |
| `POST` | `/manga` | multipart: `title`, `description?`, `coverFrom?`, `cover?` (файл), `chapters[]` (PDF) | `Manga` с `chapters[]` |
| `DELETE` | `/manga/:id` | `id` | `{ ok }` |
| `POST` | `/manga/:id/cover` | multipart: `file` (изображение) | `Manga` |
| `POST` | `/manga/:id/regenerate-cover` | `id, page?` (номер страницы) | `Manga` |
| `POST` | `/manga/:id/chapters` | multipart: `file` (PDF), `chapterNumber`, `title?` | `MangaChapter` |
| `DELETE` | `/manga/:id/chapters/:chapterId` | `id, chapterId` | `{ ok }` |
| `GET` | `/manga/:id/cover` | `id` | `{ url: string }` |
| `GET` | `/manga/:id/chapters/:chapterId/pdf` | `id, chapterId` | stream (PDF) |

## Модели

```typescript
type Manga = {
  id: string
  title: string
  description: string | null
  coverImg: string | null
  coverFrom: string | null    // "first" | "upload" | "page:N"
  createdAt: string
  chapters: MangaChapter[]
}

type MangaChapter = {
  id: string
  mangaId: string
  chapterNumber: number
  title: string | null
  filePath: string
  pageCount: number | null
  size: number
  createdAt: string
}
```
