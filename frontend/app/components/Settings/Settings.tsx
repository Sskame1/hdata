"use client";

import { useState } from "react";

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

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  showBlur: boolean;
  onBlurChange: (value: boolean) => void;
  tags: Tag[];
  onAddTag: (name: string, color: string) => void;
  onDeleteTag: (id: string) => void;
  onUpdateTag: (id: string, name: string, color: string) => void;
  onSaveSettings: (settings: { STEALTH_MODE: boolean }) => void;
  collections?: Collection[];
  onAddCollection?: (name: string, color: string) => void;
  onDeleteCollection?: (id: string) => void;
}

const tagColors = [
  { name: "Cyan", value: "#00f5d4" },
  { name: "Purple", value: "#9b5de5" },
  { name: "Pink", value: "#f15bb5" },
  { name: "Yellow", value: "#fee440" },
  { name: "Red", value: "#ef233c" },
  { name: "Green", value: "#06d6a0" },
  { name: "Blue", value: "#118ab2" },
  { name: "Orange", value: "#ff9f1c" },
];

export const Settings = ({ 
  isOpen, 
  onClose, 
  showBlur, 
  onBlurChange,
  tags,
  onAddTag,
  onDeleteTag,
  onUpdateTag,
  onSaveSettings,
  collections = [],
  onAddCollection,
  onDeleteCollection,
}: SettingsProps) => {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagColors[0].value);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState(tagColors[1].value);

  if (!isOpen) return null;

  const handleAddCollection = () => {
    if (newCollectionName.trim() && onAddCollection) {
      onAddCollection(newCollectionName.trim(), newCollectionColor);
      setNewCollectionName("");
      setNewCollectionColor(tagColors[1].value);
    }
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      onAddTag(newTagName.trim(), newTagColor);
      setNewTagName("");
      setNewTagColor(tagColors[0].value);
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onUpdateTag(id, editName.trim(), editColor);
    }
    setEditingTag(null);
    setEditName("");
    setEditColor("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div 
        className="relative z-10 w-full max-w-sm mx-4 bg-[#12121a] rounded-lg shadow-2xl overflow-hidden border border-[#2a2a3a] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#00f5d4] to-[#9b5de5] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0a0a0f] font-mono">CONFIG_VAULT</h2>
            <button onClick={onClose} className="text-[#0a0a0f]/70 hover:text-[#0a0a0f]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2a2a3a]">
            <div>
              <h3 className="font-mono text-sm text-[#e0e0e0]">STEALTH_MODE</h3>
              <p className="text-xs text-[#5a5a6a] font-mono">Hide media previews</p>
            </div>
            <button
              onClick={() => {
                const newValue = !showBlur;
                onBlurChange(newValue);
                onSaveSettings({ STEALTH_MODE: newValue });
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                showBlur ? "bg-[#00f5d4]" : "bg-[#2a2a3a]"
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                showBlur ? "left-7" : "left-1"
              }`} />
            </button>
          </div>

          <div className="pt-2">
            <h3 className="font-mono text-sm text-[#e0e0e0] mb-3">TAGS_DATABASE</h3>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="TAG_NAME..."
                className="flex-1 px-3 py-2 rounded bg-[#0a0a0f] border border-[#2a2a3a] focus:border-[#00f5d4] outline-none font-mono text-sm text-[#e0e0e0]"
              />
              <select
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="px-2 py-2 rounded bg-[#0a0a0f] border border-[#2a2a3a] focus:border-[#00f5d4] outline-none font-mono text-sm"
              >
                {tagColors.map((color) => (
                  <option key={color.value} value={color.value} style={{ backgroundColor: color.value, color: color.value === '#fee440' ? '#000' : '#fff' }}>
                    {color.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-[#00f5d4]/20 border border-[#00f5d4]/50 text-[#00f5d4] rounded font-mono text-sm hover:bg-[#00f5d4]/30"
              >
                +
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 p-2 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  
                  {editingTag === tag.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-[#12121a] border border-[#2a2a3a] outline-none font-mono text-sm text-[#e0e0e0]"
                        autoFocus
                      />
                      <select
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="px-1 py-1 rounded bg-[#12121a] border border-[#2a2a3a] outline-none font-mono text-xs"
                      >
                        {tagColors.map((c) => (
                          <option key={c.value} value={c.value}>{c.name}</option>
                        ))}
                      </select>
                      <button onClick={() => handleSaveEdit(tag.id)} className="text-[#00f5d4] hover:text-[#00f5d4]/70">
                        ✓
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 font-mono text-sm text-[#e0e0e0]">{tag.name}</span>
                      <span className="text-xs text-[#5a5a6a] font-mono">({tag.count})</span>
                      <button onClick={() => handleStartEdit(tag)} className="text-[#9b5de5] hover:text-[#9b5de5]/70">
                        ✎
                      </button>
                      <button onClick={() => onDeleteTag(tag.id)} className="text-red-400 hover:text-red-400/70">
                        ✕
                      </button>
                    </>
                  )}
                </div>
              ))}
              
              {tags.length === 0 && (
                <p className="text-center text-[#5a5a6a] font-mono text-xs py-4">NO_TAGS_INITIALIZED</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <h3 className="font-mono text-sm text-[#e0e0e0] mb-3">FOLDERS_DATABASE</h3>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="FOLDER_NAME..."
                className="flex-1 px-3 py-2 rounded bg-[#0a0a0f] border border-[#2a2a3a] focus:border-[#9b5de5] outline-none font-mono text-sm text-[#e0e0e0]"
              />
              <select
                value={newCollectionColor}
                onChange={(e) => setNewCollectionColor(e.target.value)}
                className="px-2 py-2 rounded bg-[#0a0a0f] border border-[#2a2a3a] focus:border-[#9b5de5] outline-none font-mono text-sm"
              >
                {tagColors.map((color) => (
                  <option key={color.value} value={color.value} style={{ backgroundColor: color.value, color: color.value === '#fee440' ? '#000' : '#fff' }}>
                    {color.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddCollection}
                className="px-3 py-2 bg-[#9b5de5]/20 border border-[#9b5de5]/50 text-[#9b5de5] rounded font-mono text-sm hover:bg-[#9b5de5]/30"
              >
                +
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {collections.map((col) => (
                <div key={col.id} className="flex items-center gap-2 p-2 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="flex-1 font-mono text-sm text-[#e0e0e0]">{col.name}</span>
                  <button onClick={() => onDeleteCollection?.(col.id)} className="text-red-400 hover:text-red-400/70">
                    ✕
                  </button>
                </div>
              ))}
              
              {collections.length === 0 && (
                <p className="text-center text-[#5a5a6a] font-mono text-xs py-4">NO_FOLDERS_INITIALIZED</p>
              )}
            </div>
          </div>

          <div className="border-t border-[#2a2a3a] pt-4 mt-4">
            <div className="text-center text-[#5a5a6a] text-xs font-mono">
              <p>HDATA_VAULT v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};