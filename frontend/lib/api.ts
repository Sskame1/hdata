import type { MediaItem, Tag, Collection } from "@/types";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`API error: ${url}`, err);
    return null;
  }
}

export async function fetchFiles(): Promise<MediaItem[]> {
  const data = await request<MediaItem[]>(`${API_URL}/uploads`);
  return Array.isArray(data) ? data : [];
}

export async function fetchTags(): Promise<Tag[]> {
  const data = await request<Tag[]>(`${API_URL}/uploads/tags`);
  return Array.isArray(data) ? data : [];
}

export async function fetchCollections(): Promise<Collection[]> {
  const data = await request<Collection[]>(`${API_URL}/uploads/collections`);
  return Array.isArray(data) ? data : [];
}

export async function fetchSettings(): Promise<{ STEALTH_MODE: boolean }> {
  const data = await request<{ STEALTH_MODE: boolean }>(
    `${API_URL}/uploads/settings`,
  );
  return data ?? { STEALTH_MODE: false };
}

export async function uploadFile(file: File): Promise<MediaItem | null> {
  const formData = new FormData();
  formData.append("file", file);
  return request<MediaItem>(`${API_URL}/uploads`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteFile(
  filename: string,
): Promise<{ success: boolean } | null> {
  return request<{ success: boolean }>(
    `${API_URL}/uploads/${encodeURIComponent(filename)}`,
    { method: "DELETE" },
  );
}

export async function saveTags(
  tags: Tag[],
): Promise<{ success: boolean } | null> {
  return request<{ success: boolean }>(`${API_URL}/uploads/tags`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
}

export async function saveFileTags(
  filename: string,
  tags: string[],
): Promise<{ success: boolean } | null> {
  return request<{ success: boolean }>(
    `${API_URL}/uploads/${encodeURIComponent(filename)}/tags`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    },
  );
}

export async function saveCollections(
  collections: Collection[],
): Promise<{ success: boolean } | null> {
  return request<{ success: boolean }>(`${API_URL}/uploads/collections`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collections }),
  });
}

export async function saveFileCollection(
  filename: string,
  collectionId: string | null,
): Promise<{ success: boolean } | null> {
  return request<{ success: boolean }>(
    `${API_URL}/uploads/${encodeURIComponent(filename)}/collection`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId }),
    },
  );
}

export async function saveSettings(settings: {
  STEALTH_MODE: boolean;
}): Promise<{ success: boolean } | null> {
  return request<{ success: boolean }>(`${API_URL}/uploads/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}
