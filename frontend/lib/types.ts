/* Тег — name + hex color */
export type Tag = { id: string; name: string; color: string }
/* Коллекция — именованная группа файлов */
export type Collection = { id: string; name: string }
/* Связь файл↔тег (M:N junction) */
export type TagMedia = { fileId: string; tagId: string }
/* Связь файл↔коллекция (M:N junction) */
export type CollectionMedia = { fileId: string; collectionId: string }
/* Группа внутри коллекции (подкатегория, привязана к конкретной коллекции) */
export type CollectionGroup = { id: string; name: string; collectionId: string }
/* Связь файл↔группа коллекции */
export type FileGroup = { fileId: string; groupId: string }
/* Допустимые типы медиафайлов */
export type MediaType = "img" | "gif" | "video"
export type Tab = "all" | MediaType
/* Медиафайл из бэкенда */
export type FileItem = {
  id: string
  filename: string
  path: string
  type: MediaType
  size: number
  mimeType: string
  thumbnail: string | null
  width: number | null
  height: number | null
  duration: number | null
  createdAt: string
  tags: { fileId: string; tagId: string }[]
  collections: { fileId: string; collectionId: string }[]
}
/* Статистика */
export type Stats = {
  counts: {
    files: number
    images: number
    gifs: number
    videos: number
    tags: number
    collections: number
    collectionGroups: number
    apps: number
    manga: number
    dbSizeBytes: number
  }
  distribution: {
    filesPerTag: { tagId: string; tagName: string; tagColor: string; count: number }[]
    filesPerCollection: { collectionId: string; collectionName: string; count: number }[]
    filesPerGroup: { groupId: string; groupName: string; collectionName: string; count: number }[]
    tagsPerFile: { min: number; max: number; avg: number }
    collectionsPerFile: { min: number; max: number; avg: number }
    groupsPerFile: { min: number; max: number; avg: number }
  }
  storage: { usedBytes: number; totalBytes: number; availableBytes: number } | null
}
/* Приложение из магазина */
export type AppItem = {
  id: string
  name: string
  description: string | null
  version: string | null
  coverImg: string | null
  size: number | null
  createdAt: string
  screenshots: { id: string; path: string; order: number }[]
  videos: { id: string; path: string; order: number }[]
  downloads: { id: string; path: string; name: string; size: number; version: string | null }[]
}

/* Манга */
export type MangaChapter = {
  id: string
  mangaId: string
  chapterNumber: number
  title: string | null
  filePath: string
  pageCount: number | null
  size: number
  createdAt: string
}

export type MangaTag = { id: string; name: string; color: string }

export type MangaItem = {
  id: string
  title: string
  description: string | null
  coverImg: string | null
  coverFrom: string | null
  createdAt: string
  chapters: MangaChapter[]
  mangaTags: { mangaId: string; tagId: string; tag: MangaTag }[]
}
