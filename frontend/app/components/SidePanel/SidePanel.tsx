"use client";

import { useState } from "react";

interface Collection {
  id: string;
  name: string;
  color: string;
}

interface SidePanelProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  collections?: Collection[];
}

const menuItems = [
  { id: "all", icon: "◈", label: "VAULT" },
  { id: "images", icon: "◉", label: "IMAGES" },
  { id: "videos", icon: "▷", label: "VIDEOS" },
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
    <div className="w-20 h-full glass-dark flex flex-col items-center py-4 border-r border-[#2a2a3a] z-0">
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00f5d4] to-[#9b5de5] flex items-center justify-center mb-6 cyan-glow">
        <span className="text-lg font-bold text-[#0a0a0f]">H</span>
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full px-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onFilterChange(item.id)}
            className={`w-full p-3 flex flex-col items-center rounded-lg transition-all ${
              activeFilter === item.id
                ? "bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/30"
                : "text-[#8a8a9a] hover:bg-[#1a1a25] hover:text-[#e0e0e0]"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-mono mt-0.5">{item.label}</span>
          </button>
        ))}
        
        <div className="w-full border-t border-[#2a2a3a] my-1" />
        
        <button
          onClick={() => setShowCollections(!showCollections)}
          className={`w-full p-3 flex flex-col items-center rounded-lg transition-all ${
            activeFilter.startsWith('collection:')
              ? "bg-[#9b5de5]/20 text-[#9b5de5] border border-[#9b5de5]/30"
              : "text-[#8a8a9a] hover:bg-[#1a1a25] hover:text-[#e0e0e0]"
          }`}
        >
          <span className="text-xl">{showCollections ? "▾" : "▸"}</span>
          <span className="text-[10px] font-mono mt-0.5">FOLDERS</span>
        </button>
        
        {showCollections && collections.map((col) => (
          <button
            key={col.id}
            onClick={() => handleCollectionClick(col.id)}
            className={`w-full py-2 px-2 flex items-center gap-2 rounded-lg transition-all ${
              activeFilter === `collection:${col.id}`
                ? "bg-[#9b5de5]/20 text-[#9b5de5] border border-[#9b5de5]/30"
                : "text-[#8a8a9a] hover:bg-[#1a1a25] hover:text-[#e0e0e0]"
            }`}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: col.color }}
            />
            <span className="text-[10px] font-mono truncate">{col.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-[#2a2a3a] w-full px-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`w-full p-3 flex flex-col items-center rounded-lg transition-all ${
              activeFilter === tool.id || activeTool === tool.id
                ? "bg-[#9b5de5]/20 text-[#9b5de5] border border-[#9b5de5]/30"
                : "text-[#8a8a9a] hover:bg-[#1a1a25] hover:text-[#e0e0e0]"
            }`}
          >
            <span className="text-xl">{tool.icon}</span>
            <span className="text-[10px] font-mono mt-0.5">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};