"use client";

import Image from "next/image";
import { useState } from "react";
import type { MediaItem, Tag } from "@/types";

interface MediaCardProps {
  item: MediaItem;
  onClick: () => void;
  showBlur?: boolean;
  tags?: Tag[];
  selected?: boolean;
  onToggleSelection?: () => void;
}

export const MediaCard = ({ item, onClick, showBlur, tags = [], selected, onToggleSelection }: MediaCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const isVideo = item.mimetype.startsWith("video/") || 
    /\.(mp4|webm|mov|avi|mkv|m4v|ts)$/i.test(item.filename);
  const isGif = /\.gif$/i.test(item.filename);
  const isDoc = item.mimetype.startsWith("application/") || 
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "7z", "txt", "json", "xml", "html", "css", "js", "ts"].some(ext => item.filename.toLowerCase().endsWith(ext));

  const itemTags = item.tags?.map(tagName => tags.find(t => t.name === tagName)).filter(Boolean) as Tag[] || [];

  const getFileIcon = () => {
    if (isDoc) {
      if (item.filename.endsWith('.pdf')) return '📄';
      if (item.filename.match(/\.(doc|docx)$/i)) return '📝';
      if (item.filename.match(/\.(xls|xlsx)$/i)) return '📊';
      if (item.filename.match(/\.(ppt|pptx)$/i)) return '📽️';
      if (item.filename.match(/\.(zip|rar|7z)$/i)) return '📦';
      return '📁';
    }
    return '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className={`relative group break-inside-avoid rounded-lg overflow-hidden cursor-pointer border transition-all z-0 ${selected ? 'border-rose ring-1 ring-rose/50' : 'border-border hover:border-rose/50'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ backgroundColor: '#1d1625' }}
    >
      {(onToggleSelection) && (
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selected ? 'bg-rose border-rose' : 'bg-black/40 border-white/60 hover:border-white'}`}>
            {selected && (
              <svg className="w-3 h-3 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className="relative w-full bg-surface">
        {isVideo ? (
          item.thumbnailUrl ? (
            <>
              <div className="relative w-full aspect-[4/5]">
                <Image
                  src={item.thumbnailUrl}
                  alt={item.originalName}
                  fill
                  className={`object-cover ${showBlur ? "blur-sm" : ""}`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-surface">
              <svg className="w-12 h-12 text-rose" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <div className="text-[10px] text-dim font-mono mt-1">VIDEO</div>
            </div>
          )
        ) : isGif ? (
          item.thumbnailUrl ? (
            <div className="relative w-full aspect-[4/5]">
              <Image
                src={item.thumbnailUrl}
                alt={item.originalName}
                fill
                className={`object-cover ${showBlur ? "blur-sm" : ""}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
                loading="lazy"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-rose/80 text-white text-[10px] font-mono rounded">GIF</div>
            </div>
          ) : (
            <div className="relative w-full aspect-[4/5] flex items-center justify-center bg-surface">
              <div className="text-5xl mb-2">🎞️</div>
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-rose/80 text-white text-[10px] font-mono rounded">GIF</div>
              <div className="absolute bottom-2 left-2 right-2">
                <div className="text-[10px] text-dim font-mono truncate">{item.originalName}</div>
                <div className="text-[10px] text-dim font-mono">{formatSize(item.size)}</div>
              </div>
            </div>
          )
        ) : isDoc ? (
          <div className="relative w-full aspect-[4/5] flex items-center justify-center bg-surface">
            <div className="text-4xl">{getFileIcon()}</div>
            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-[10px] text-dim font-mono truncate">{item.originalName}</div>
              <div className="text-[10px] text-dim font-mono">{formatSize(item.size)}</div>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-[4/5]">
            <Image
              src={item.url}
              alt={item.originalName}
              fill
              className={`object-cover transition-transform duration-300 ${isHovered ? "scale-105" : "scale-100"} ${showBlur ? "blur-sm" : ""}`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
              loading="lazy"
            />
          </div>
        )}
        
        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        )}
        
        {(item.collectionName || item.collection) && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-mauve/80 text-white text-[10px] font-mono rounded">
            {item.collectionName || item.collection}
          </div>
        )}
      </div>

      {itemTags.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
          {itemTags.slice(0, 3).map((tag) => (
            <span 
              key={tag.id} 
              className="px-2 py-0.5 rounded text-[10px] font-mono text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};