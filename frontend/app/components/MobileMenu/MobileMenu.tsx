"use client";

import type { Collection } from "@/types";

interface MobileMenuProps {
  collections: Collection[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onClose: () => void;
}

export const MobileMenu = ({
  collections,
  activeFilter,
  onFilterChange,
  onClose,
}: MobileMenuProps) => {
  const handleClick = (filter: string) => {
    onFilterChange(filter);
    onClose();
  };

  return (
    <div className="md:hidden fixed top-10 left-0 right-0 bg-[#12121a] border-b border-[#2a2a3a] z-[300] max-h-48 overflow-y-auto shadow-lg">
      {["all", "images", "videos", "documents"].map((id) => (
        <button
          key={id}
          onClick={() => handleClick(id)}
          className={`w-full px-4 py-2 text-left text-sm font-mono ${
            activeFilter === id
              ? "text-[#00f5d4] bg-[#00f5d4]/10"
              : "text-[#8a8a9a]"
          }`}
        >
          {id === "all"
            ? "ALL"
            : id === "images"
              ? "IMAGES"
              : id === "videos"
                ? "VIDEOS"
                : "DOCUMENTS"}
        </button>
      ))}
      {collections.map((col) => (
        <button
          key={col.id}
          onClick={() => handleClick(`collection:${col.id}`)}
          className={`w-full px-4 py-2 text-left text-sm font-mono flex items-center gap-2 ${
            activeFilter === `collection:${col.id}`
              ? "text-[#9b5de5] bg-[#9b5de5]/10"
              : "text-[#8a8a9a]"
          }`}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: col.color }}
          />
          {col.name}
        </button>
      ))}
    </div>
  );
};
