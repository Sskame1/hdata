"use client";

import { useState } from "react";
import type { Collection } from "@/types";

interface SidePanelProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  collections?: Collection[];
}

const menuItems = [
  { id: "all", icon: "◈", label: "VAULT" },
  { id: "images", icon: "◉", label: "IMAGES" },
  { id: "videos", icon: "▷", label: "VIDEOS" },
  { id: "gifs", icon: "🎞️", label: "GIFS" },
];

const tools = [
  { id: "settings", icon: "⚙", label: "CONFIG" },
];

export const SidePanel = ({ activeFilter, onFilterChange, collections = [] }: SidePanelProps) => {
  const [activeTool, setActiveTool] = useState("");
  const [showCollections, setShowCollections] = useState(false);

  const handleToolClick = (id: string) => {
    setActiveTool(id);
    if (id === "settings") {
      onFilterChange("settings");
    }
  };

  const handleCollectionClick = (id: string) => {
    onFilterChange(`collection:${id}`);
  };

  return (
    <div className="w-28 h-full glass-dark flex flex-col items-center py-4 border-r border-border z-0">
      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-rose to-mauve flex items-center justify-center mb-6 accent-glow">
        <span className="text-xl font-bold text-dark">H</span>
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full px-1 min-h-0">
        <div className="flex-shrink-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className={`w-full p-3 flex flex-col items-center rounded-lg transition-all ${
                activeFilter === item.id
                  ? "bg-rose/20 text-rose border border-rose/30"
                  : "text-muted hover:bg-card hover:text-text"
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-mono mt-1">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex-shrink-0 w-full border-t border-border my-1" />
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <button
            onClick={() => setShowCollections(!showCollections)}
            className={`w-full p-3 flex flex-col items-center rounded-lg transition-all flex-shrink-0 ${
              activeFilter.startsWith('collection:')
                ? "bg-mauve/20 text-mauve border border-mauve/30"
                : "text-muted hover:bg-card hover:text-text"
            }`}
          >
            <span className="text-2xl">{showCollections ? "▾" : "▸"}</span>
            <span className="text-xs font-mono mt-1">FOLDERS</span>
          </button>
          
          {showCollections && collections.map((col) => (
            <button
              key={col.id}
              onClick={() => handleCollectionClick(col.id)}
              className={`w-full py-2 px-2 flex items-center gap-2 rounded-lg transition-all ${
                activeFilter === `collection:${col.id}`
                  ? "bg-mauve/20 text-mauve border border-mauve/30"
                  : "text-muted hover:bg-card hover:text-text"
              }`}
            >
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: col.color }}
              />
              <span className="text-xs font-mono truncate">{col.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-border w-full px-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`w-full p-3 flex flex-col items-center rounded-lg transition-all ${
              activeFilter === tool.id || activeTool === tool.id
                ? "bg-mauve/20 text-mauve border border-mauve/30"
                : "text-muted hover:bg-card hover:text-text"
            }`}
          >
            <span className="text-2xl">{tool.icon}</span>
            <span className="text-xs font-mono mt-1">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
