"use client";

import { MediaCard } from "../MediaCard/MediaCard";
import type { MediaItem, Tag, Collection } from "@/types";

interface WorkspaceProps {
  items: MediaItem[];
  isLoading: boolean;
  searchQuery: string;
  onItemClick: (item: MediaItem) => void;
  showBlur?: boolean;
  tags?: Tag[];
  selectedFilenames: Set<string>;
  onToggleSelection: (filename: string) => void;
  onClearSelection: () => void;
  onBatchDelete: () => void;
  onBatchCollection: (collectionId: string) => void;
  collections: Collection[];
}

export const Workspace = ({
  items, isLoading, searchQuery, onItemClick, showBlur = false, tags = [],
  selectedFilenames, onToggleSelection, onClearSelection,
  onBatchDelete, onBatchCollection, collections,
}: WorkspaceProps) => {
  const hasSelection = selectedFilenames.size > 0;

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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 z-0 relative">
          {items.map((item) => (
            <div key={item.id} className="break-inside-avoid mb-3">
              <MediaCard
                item={item}
                onClick={() => onItemClick(item)}
                showBlur={showBlur}
                tags={tags}
                selected={selectedFilenames.has(item.filename)}
                onToggleSelection={() => onToggleSelection(item.filename)}
              />
            </div>
          ))}
        </div>
      </div>

      {hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#12121a]/95 border-t border-[#2a2a3a] backdrop-blur-md p-3 flex items-center gap-3 flex-wrap">
          <span className="text-[#00f5d4] font-mono text-sm mr-2">
            {selectedFilenames.size} SELECTED
          </span>
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 bg-[#1a1a25] border border-[#2a2a3a] text-[#8a8a9a] rounded-lg font-mono text-xs hover:border-[#5a5a6a]"
          >
            CLEAR
          </button>
          <button
            onClick={onBatchDelete}
            className="px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-mono text-xs hover:bg-red-500/30"
          >
            DELETE
          </button>
          <div className="relative group">
            <button className="px-3 py-1.5 bg-[#9b5de5]/20 border border-[#9b5de5]/50 text-[#9b5de5] rounded-lg font-mono text-xs hover:bg-[#9b5de5]/30">
              MOVE TO
            </button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-[#12121a] border border-[#2a2a3a] rounded-lg overflow-hidden min-w-[140px] shadow-xl">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => onBatchCollection(col.id)}
                  className="w-full px-3 py-2 text-left text-[#e0e0e0] font-mono text-xs hover:bg-[#1a1a25] flex items-center gap-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  {col.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
