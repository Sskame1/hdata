"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface Collection {
  id: string;
  name: string;
  color: string;
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

interface ModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onDelete: (filename: string) => void;
  tags: Tag[];
  onAddTag: (tagName: string) => void;
  onRemoveTag?: (tagName: string) => void;
  collections?: Collection[];
  onAddToCollection?: (collectionId: string) => void;
  onRemoveFromCollection?: () => void;
}

export const Modal = ({ item, onClose, onDelete, tags, onAddTag, onRemoveTag, collections = [], onAddToCollection, onRemoveFromCollection }: ModalProps) => {
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  const getTouchDistance = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    return null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const dist = getTouchDistance(e);
    if (dist) {
      setTouchStartDist(dist);
      return;
    }
    if (zoom > 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dist = getTouchDistance(e);
    if (dist && touchStartDist) {
      const scale = dist / touchStartDist;
      setZoom(Math.max(0.5, Math.min(3, zoom * scale)));
      setTouchStartDist(dist);
      return;
    }
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartDist(null);
  };

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  const filteredCollections = collections.filter(c => c.name.toLowerCase().includes(collectionSearch.toLowerCase()));

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!item) return null;

  const isVideo = item.isVideoThumbnail || item.mimetype.startsWith("video/") || 
    /\.(mp4|webm|mov|avi|mkv|m4v|ts)$/i.test(item.filename);
  const isDoc = item.mimetype.startsWith("application/") || 
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "7z", "txt", "json", "xml", "html", "css", "js", "ts"].some(ext => item.filename.toLowerCase().endsWith(ext));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const itemTags = item.tags?.map(tagName => tags.find(t => t.name === tagName)).filter(Boolean) as Tag[] || [];
  const availableTags = tags.filter((tag) => !item.tags?.includes(tag.name));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      
      <div 
        className="relative z-10 w-[95vw] md:w-auto max-h-[90vh] flex flex-col md:flex-row gap-2 md:gap-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 md:-top-12 right-0 text-[#8a8a9a] hover:text-[#00f5d4] transition-colors z-10"
        >
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-[#12121a] rounded-lg p-2 md:p-4 border border-[#2a2a3a] flex flex-col items-center justify-center order-1 md:order-none overflow-hidden">
          <div className={`flex items-center justify-center overflow-auto w-full ${isVideo || isDoc ? '' : 'max-h-[50vh] md:max-h-[65vh]'}`}>
            {isVideo ? (
              <div className="relative bg-[#0a0a0f] rounded-lg overflow-hidden flex items-center justify-center w-full">
                <video
                  src={item.url}
                  controls
                  className="max-h-[40vh] md:max-h-[65vh] w-full"
                  preload="auto"
                  onError={(e) => console.error('Video error:', e.currentTarget.error)}
                />
              </div>
            ) : isDoc ? (
              <div className="max-h-[40vh] md:max-h-[65vh] w-[300px] md:w-[400px] flex items-center justify-center bg-[#0a0a0f] rounded-lg">
                <div className="text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-[#e0e0e0] font-mono">{item.originalName}</p>
                  <p className="text-[#5a5a6a] font-mono text-sm mt-2">{formatSize(item.size)}</p>
                </div>
              </div>
            ) : (
              <div 
                className="overflow-hidden max-w-full max-h-[65vh] flex items-center justify-center touch-none"
                style={{ cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
                onMouseDown={(e) => {
                  if (zoom > 1) {
                    setIsDragging(true);
                    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
                  }
                }}
                onMouseMove={(e) => {
                  if (isDragging && zoom > 1) {
                    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                  }
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease'
                }}>
                  <Image
                    src={item.url}
                    alt={item.originalName}
                    width={800}
                    height={600}
                    className="rounded-lg object-contain"
                    unoptimized
                    draggable={false}
                  />
                </div>
              </div>
            )}
          </div>
          {!isVideo && !isDoc && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                className="w-8 h-8 flex items-center justify-center bg-[#1a1a25] hover:bg-[#2a2a3a] border border-[#2a2a3a] rounded text-[#e0e0e0] font-mono text-sm transition-colors"
              >
                −
              </button>
              <span className="text-[#e0e0e0] font-mono text-xs w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                className="w-8 h-8 flex items-center justify-center bg-[#1a1a25] hover:bg-[#2a2a3a] border border-[#2a2a3a] rounded text-[#e0e0e0] font-mono text-sm transition-colors"
              >
                +
              </button>
              <button
                onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
                className="px-2 h-8 flex items-center justify-center bg-[#1a1a25] hover:bg-[#2a2a3a] border border-[#2a2a3a] rounded text-[#e0e0e0] font-mono text-xs transition-colors"
              >
                RESET
              </button>
            </div>
          )}
        </div>

        <div className="w-full md:w-72 flex flex-col justify-between order-2 md:order-none max-h-[35vh] md:max-h-none overflow-y-auto">
          <div className="text-[#e0e0e0]">
            <p className="font-mono text-xs md:text-sm truncate">{item.originalName}</p>
            <p className="text-[#5a5a6a] text-xs font-mono mt-1">{formatSize(item.size)}</p>
            <p className="text-[#5a5a6a] text-xs font-mono">{item.mimetype}</p>
            
            {(itemTags.length > 0 || item.collection) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {item.collection && (
                  <span
                    className="px-2 py-1 rounded text-xs font-mono flex items-center gap-1 bg-[#9b5de5]/80 text-white"
                  >
                    📁 {item.collectionName || item.collection}
                    {onRemoveFromCollection && (
                      <button
                        onClick={onRemoveFromCollection}
                        className="ml-1 text-white/70 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </span>
                )}
                {itemTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 rounded text-xs font-mono flex items-center gap-1"
                    style={{ backgroundColor: tag.color, color: "white" }}
                  >
                    {tag.name}
                    {onRemoveTag && (
                      <button
                        onClick={() => onRemoveTag(tag.name)}
                        className="ml-1 text-white/70 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            
            <div className="mt-6 space-y-2">
              <div className="relative">
                <button
                  onClick={() => setShowTagMenu(!showTagMenu)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#9b5de5]/20 hover:bg-[#9b5de5]/30 border border-[#9b5de5]/50 text-[#9b5de5] rounded-lg font-mono text-sm transition-colors"
                >
                  <span className="text-sm">#</span>
                  ADD TAG
                </button>
                
                {showTagMenu && (
                  <div className="absolute left-0 right-0 top-12 w-full bg-[#12121a] rounded-lg shadow-xl overflow-hidden z-[100] max-h-48 overflow-y-auto border border-[#2a2a3a]">
                    <div className="sticky top-0 bg-[#12121a] p-2 border-b border-[#2a2a3a]">
                      <input
                        type="text"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="SEARCH..."
                        className="w-full px-2 py-1 rounded bg-[#0a0a0f] border border-[#2a2a3a] focus:border-[#9b5de5] outline-none font-mono text-xs text-[#e0e0e0]"
                        autoFocus
                      />
                    </div>
                    {filteredTags.length > 0 ? (
                      filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            onAddTag(tag.name);
                            setShowTagMenu(false);
                            setTagSearch("");
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#1a1a25] text-left transition-colors cursor-pointer"
                        >
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="text-[#e0e0e0] font-mono text-sm">{tag.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-[#5a5a6a] font-mono text-sm">NO_TAGS_FOUND</div>
                    )}
                  </div>
                )}
              </div>
              
              {onAddToCollection && (
                <div className="relative">
                  <button
                    onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#00f5d4]/20 hover:bg-[#00f5d4]/30 border border-[#00f5d4]/50 text-[#00f5d4] rounded-lg font-mono text-sm transition-colors"
                  >
                    <span className="text-sm">📁</span>
                    ADD FOLDER
                  </button>
                  
                  {showCollectionMenu && (
                    <div className="absolute left-0 right-0 top-12 w-full bg-[#12121a] rounded-lg shadow-xl overflow-hidden z-[100] max-h-48 overflow-y-auto border border-[#2a2a3a]">
                      <div className="sticky top-0 bg-[#12121a] p-2 border-b border-[#2a2a3a]">
                        <input
                          type="text"
                          value={collectionSearch}
                          onChange={(e) => setCollectionSearch(e.target.value)}
                          placeholder="SEARCH..."
                          className="w-full px-2 py-1 rounded bg-[#0a0a0f] border border-[#2a2a3a] focus:border-[#00f5d4] outline-none font-mono text-xs text-[#e0e0e0]"
                          autoFocus
                        />
                      </div>
                      {filteredCollections.length > 0 ? (
                        filteredCollections.map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => {
                              onAddToCollection(col.id);
                              setShowCollectionMenu(false);
                              setCollectionSearch("");
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#1a1a25] text-left transition-colors cursor-pointer"
                          >
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                            <span className="text-[#e0e0e0] font-mono text-sm">{col.name}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-[#5a5a6a] font-mono text-sm">NO_FOLDERS_FOUND</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-[#2a2a3a] hover:bg-[#3a3a4a] border border-[#4a4a5a] text-[#e0e0e0] rounded-lg font-mono text-sm transition-colors touch-manipulation"
              >
                CLOSE
              </button>
              
              <button
                onClick={() => onDelete(item.filename)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg font-mono text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                DELETE FILE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};