"use client";

import { useState, useRef } from "react";
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
  onBatchTags: (tagName: string) => void;
  collections: Collection[];
}

export const Workspace = ({
  items, isLoading, searchQuery, onItemClick, showBlur = false, tags = [],
  selectedFilenames, onToggleSelection, onClearSelection,
  onBatchDelete, onBatchCollection, onBatchTags, collections,
}: WorkspaceProps) => {
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const hasSelection = selectedFilenames.size > 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-rose border-t-transparent rounded-full animate-spin" />
          <p className="text-rose font-mono text-sm">ACCESSING_VAULT...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-dim">
        <div className="text-6xl mb-4 opacity50">◈</div>
        <p className="text-xl font-mono text-muted">VAULT_EMPTY</p>
        <p className="text-sm font-mono mt-2 text-dim">
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
            <div key={item.id} className="break-inside-avoid mb-3" style={{ contentVisibility: 'auto' }}>
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

      {(showCollectionMenu || showTagMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowCollectionMenu(false); setShowTagMenu(false); }} />
      )}
      {hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 border-t border-border backdrop-blur-md p-3 flex items-center gap-3 flex-wrap">
          <span className="text-rose font-mono text-sm mr-2">
            {selectedFilenames.size} SELECTED
          </span>
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 bg-card border border-border text-muted rounded-lg font-mono text-xs hover:border-dim"
          >
            CLEAR
          </button>
          <button
            onClick={onBatchDelete}
            className="px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-mono text-xs hover:bg-red-500/30"
          >
            DELETE
          </button>
          <div className="relative">
            <button
              onClick={() => { setShowCollectionMenu(!showCollectionMenu); setShowTagMenu(false); }}
              className="px-3 py-1.5 bg-mauve/20 border border-mauve/50 text-mauve rounded-lg font-mono text-xs hover:bg-mauve/30"
            >
              MOVE TO
            </button>
            {showCollectionMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-surface border border-border rounded-lg shadow-xl min-w-[180px] z-[100]">
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    placeholder="SEARCH..."
                    className="w-full px-2 py-1 rounded bg-dark border border-border text-text font-mono text-xs outline-none focus:border-mauve"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {collections
                    .filter((c) => c.name.toLowerCase().includes(collectionSearch.toLowerCase()))
                    .map((col) => (
                      <button
                        key={col.id}
                        onClick={() => { onBatchCollection(col.id); setShowCollectionMenu(false); setCollectionSearch(""); }}
                        className="w-full px-3 py-2 text-left text-text font-mono text-xs hover:bg-card flex items-center gap-2"
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                        {col.name}
                      </button>
                    ))}
                  {collections.filter((c) => c.name.toLowerCase().includes(collectionSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-dim font-mono text-xs">NOTHING_FOUND</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => { setShowTagMenu(!showTagMenu); setShowCollectionMenu(false); }}
              className="px-3 py-1.5 bg-rose/20 border border-rose/50 text-rose rounded-lg font-mono text-xs hover:bg-rose/30"
            >
              TAGS
            </button>
            {showTagMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-surface border border-border rounded-lg shadow-xl min-w-[180px] z-[100]">
                <div className="p-2 border-b border-border">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="SEARCH..."
                    className="w-full px-2 py-1 rounded bg-dark border border-border text-text font-mono text-xs outline-none focus:border-rose"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {tags
                    .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => { onBatchTags(tag.name); setShowTagMenu(false); setTagSearch(""); }}
                        className="w-full px-3 py-2 text-left text-text font-mono text-xs hover:bg-card flex items-center gap-2"
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </button>
                    ))}
                  {tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-dim font-mono text-xs">NOTHING_FOUND</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
