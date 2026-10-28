/* API-клиент.
   API_BASE: если NEXT_PUBLIC_API_URL задан → идёт к реальному бэкенду,
             если не задан → "/api" → Next.js rewrite /api/backend/* → backend:4000,
             или локальные Route Handlers (app/api/*) для JSON fallback.
   BACKEND_BASE: прямой вызов backend :4000 (upload, админ-операции, минуя Next.js proxy). */
import type { Tag, Collection, TagMedia, CollectionMedia, FileItem, AppItem, CollectionGroup, FileGroup, Stats, MangaItem, MangaChapter, MangaTag } from "./types";

interface NextData {
  env?: { NEXT_PUBLIC_API_URL?: string }
}

const BASE = typeof window !== "undefined"
  ? ((window as unknown) as { __NEXT_DATA__?: NextData }).__NEXT_DATA__?.env?.NEXT_PUBLIC_API_URL
  : undefined;

export const API_BASE = BASE ?? process.env.NEXT_PUBLIC_API_URL ?? "/api";

export function setApiBase(base: string) {
  (process as { env: Record<string, string | undefined> }).env.NEXT_PUBLIC_API_URL = base;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

/* POST напрямую на BACKEND_BASE (минуя Next.js proxy) */
async function postDirect<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

/* Tags: list / create / update / delete */
export const tagsApi = {
  list: () => get<Tag[]>("/tags"),
  create: (name: string, color: string) => post<Tag>("/tags", { name, color }),
  update: (id: string, name: string, color: string) => patch<Tag>(`/tags/${id}`, { name, color }),
  delete: (id: string) => del<{ ok: boolean }>(`/tags?id=${id}`),
};

/* Tags-Media: управление связями файл↔тег */
export const tagMediaApi = {
  list: () => get<TagMedia[]>("/tags-media"),
  link: (media: string, tagId: string) => post<{ ok: boolean }>("/tags-media", { media, tagId }),
  unlink: (media: string, tagId: string) => del<{ ok: boolean }>(`/tags-media?media=${media}&tagId=${tagId}`),
  bulkLink: (fileIds: string[], tagIds: string[]) => post<{ ok: boolean; created: number }>("/tags-media/bulk", { fileIds, tagIds }),
};

/* Collections: list / create / update / delete */
export const collectionsApi = {
  list: () => get<Collection[]>("/collections"),
  create: (name: string) => post<Collection>("/collections", { name }),
  update: (id: string, name: string) => patch<Collection>(`/collections/${id}`, { name }),
  delete: (id: string) => del<{ ok: boolean }>(`/collections?id=${id}`),
};

/* Collections-Media: управление связями файл↔коллекция */
export const collectionMediaApi = {
  list: () => get<CollectionMedia[]>("/collections-media"),
  link: (media: string, collectionId: string) => post<{ ok: boolean }>("/collections-media", { media, collectionId }),
  unlink: (media: string, collectionId: string) => del<{ ok: boolean }>(`/collections-media?media=${media}&collectionId=${collectionId}`),
  bulkLink: (fileIds: string[], collectionIds: string[]) => post<{ ok: boolean; created: number }>("/collections-media/bulk", { fileIds, collectionIds }),
};

/* Groups: группы внутри коллекций */
export const groupsApi = {
  list: (collectionId: string) => get<CollectionGroup[]>(`/collections/${collectionId}/groups`),
  create: (collectionId: string, name: string) => post<CollectionGroup>(`/collections/${collectionId}/groups`, { name, collectionId }),
  update: (collectionId: string, id: string, name: string) => patch<CollectionGroup>(`/collections/${collectionId}/groups/${id}`, { name }),
  delete: (collectionId: string, id: string) => del<{ ok: boolean }>(`/collections/${collectionId}/groups/${id}`),
};

/* Groups-Media: управление связями файл↔группа */
export const groupMediaApi = {
  list: () => get<FileGroup[]>("/groups-media"),
  link: (media: string, groupId: string) => post<{ ok: boolean }>("/groups-media", { media, groupId }),
  unlink: (media: string, groupId: string) => del<{ ok: boolean }>(`/groups-media?media=${media}&groupId=${groupId}`),
  bulkLink: (fileIds: string[], groupIds: string[]) => post<{ ok: boolean; created: number }>("/groups-media/bulk", { fileIds, groupIds }),
};

/* Upload и админ-операции идут напрямую на backend :4000,
   минуя Next.js прокси (ограничение 10MB / таймаут). */
export const BACKEND_BASE = typeof window !== "undefined"
  ? `http://${window.location.hostname}:4000`
  : "http://backend:4000";

/* Files: медиафайлы (img/gif/video) */
export const filesApi = {
  list: (params?: { type?: string; tagIds?: string; collectionIds?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set("type", params.type);
    if (params?.tagIds) q.set("tagIds", params.tagIds);
    if (params?.collectionIds) q.set("collectionIds", params.collectionIds);
    const qs = q.toString();
    return get<FileItem[]>(`/files${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => get<FileItem>(`/files/${id}`),
  delete: (id: string) => del<{ ok: boolean }>(`/files/${id}`),
  storageStats: () => get<{ usedBytes: number; totalBytes: number; availableBytes: number }>("/files/storage-stats"),
  cacheStats: () => get<{ sizeBytes: number; fileCount: number }>("/files/cache-stats"),
  clearCache: () => postDirect<{ ok: boolean }>("/files/clear-cache"),
  thumbnailUrl: (id: string) => `${API_BASE}/files/${id}/thumbnail`,
  downloadUrl: (id: string) => `${BACKEND_BASE}/files/${id}/download`,
  regenerateThumbnails: () => postDirect<{ id: string; filename: string; status: string; error?: string }[]>("/files/regenerate-thumbnails"),
  syncFromStorage: () => postDirect<{ path: string; status: string; error?: string }[]>("/files/sync-from-storage"),
  /* Upload напрямую на BACKEND_BASE (минуя Next.js proxy) */
  upload: async (file: File, type: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BACKEND_BASE}/files/upload?type=${type}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`POST /files/upload failed: ${res.status}`);
    return res.json() as Promise<{ id: string; path: string; thumbnail?: string }>;
  },
};

/* Apps: магазин приложений */
async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export const appsApi = {
  list: () => get<AppItem[]>("/apps"),
  get: (id: string) => get<AppItem>(`/apps/${id}`),
  delete: (id: string) => del<{ ok: boolean }>(`/apps/${id}`),
  create: (formData: FormData) => postFormData<AppItem>("/apps", formData),
  mediaUrl: (id: string, type: "screenshots" | "videos", mediaId: string) => `${API_BASE}/apps/${id}/media/${type}/${mediaId}`,
  coverUrl: (id: string) => `${API_BASE}/apps/${id}/cover`,
  downloadUrl: (id: string, downloadId: string) => `${API_BASE}/apps/${id}/download/${downloadId}`,
};

/* Stat: статистика */
export const statApi = {
  get: () => get<Stats>("/stat"),
};

/* Manga */
export const mangaApi = {
  list: () => get<MangaItem[]>("/manga"),
  get: (id: string) => get<MangaItem>(`/manga/${id}`),
  delete: (id: string) => del<{ ok: boolean }>(`/manga/${id}`),
  coverUrl: (id: string) => `${API_BASE}/manga/${id}/cover`,
  pdfUrl: (mangaId: string, chapterId: string) => `${API_BASE}/manga/${mangaId}/chapters/${chapterId}/pdf`,
  addChapter: async (mangaId: string, chapterNumber: number, title: string | undefined, file: File, pageCount?: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("chapterNumber", String(chapterNumber));
    if (title) form.append("title", title);
    if (pageCount) form.append("pageCount", String(pageCount));
    const res = await fetch(`${BACKEND_BASE}/manga/${mangaId}/chapters`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`POST /manga/${mangaId}/chapters failed: ${res.status}`);
    return res.json() as Promise<MangaChapter>;
  },
};

/* Manga Tags: CRUD тегов для манги */
export const mangaTagsApi = {
  list: () => get<MangaTag[]>("/manga-tags"),
  create: (name: string, color: string) => post<MangaTag>("/manga-tags", { name, color }),
  update: (id: string, name: string, color: string) => patch<MangaTag>(`/manga-tags/${id}`, { name, color }),
  delete: (id: string) => del<{ ok: boolean }>(`/manga-tags?id=${id}`),
};

/* Manga Tags ↔ Manga: управление связями */
export const mangaTagMediaApi = {
  byManga: (mangaId: string) => get<{ mangaId: string; tagId: string; tag: MangaTag }[]>(`/manga-tags/by-manga/${mangaId}`),
  link: (mangaId: string, tagId: string) => post<{ ok: boolean }>("/manga-tags/assign", { mangaId, tagId }),
  unlink: (mangaId: string, tagId: string) => del<{ ok: boolean }>(`/manga-tags/assign?mangaId=${mangaId}&tagId=${tagId}`),
};

/* Загрузить все метаданные параллельно (теги + коллекции + группы + связи) */
export function loadAllMetadata() {
  return Promise.all([
    tagsApi.list(),
    collectionsApi.list(),
    tagMediaApi.list(),
    collectionMediaApi.list(),
    groupMediaApi.list(),
  ]).then(([tags, collections, tagMedia, collectionMedia, groupMedia]) => ({
    tags, collections, tagMedia, collectionMedia, groupMedia,
  }));
}
