"use client";

import { MediaCard } from "../MediaCard/MediaCard";

interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface MediaItem {
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
}

interface WorkspaceProps {
  items: MediaItem[];
  isLoading: boolean;
  searchQuery: string;
  onItemClick: (item: MediaItem) => void;
  showBlur?: boolean;
  tags?: Tag[];
}

export const Workspace = ({ items, isLoading, searchQuery, onItemClick, showBlur = false, tags = [] }: WorkspaceProps) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#00f5d4] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#00f5d4] font-mono text-sm">ACCESSING_VAULT...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#5a5a6a]">
        <div className="text-6xl mb-4 opacity50">◈</div>
        <p className="text-xl font-mono text-[#8a8a9a]">VAULT_EMPTY</p>
        <p className="text-sm font-mono mt-2 text-[#5a5a6a]">
          {searchQuery ? "NO_MATCH_FOUND" : "UPLOAD_FILES_TO_BEGIN"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 z-0 relative">
        {items.map((item) => (
          <div key={item.id} className="break-inside-avoid mb-3">
            <MediaCard item={item} onClick={() => onItemClick(item)} showBlur={showBlur} tags={tags} />
          </div>
        ))}
      </div>
    </div>
  );
};