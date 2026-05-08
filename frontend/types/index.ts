export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  isVideoThumbnail?: boolean;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  tags?: string[];
  collection?: string | null;
  collectionName?: string | null;
  createdAt?: string;
}

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

export interface SearchOptions {
  query: string;
  tags: string[];
  tagMode: 'AND' | 'OR';
  dateFrom?: string;
  dateTo?: string;
  sizeMin?: number;
  sizeMax?: number;
}
