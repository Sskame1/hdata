"use client";

import { useState } from "react";
import type { Tag, Collection } from "@/types";

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
  onReorderTags?: (tags: Tag[]) => void;
  onReorderCollections?: (collections: Collection[]) => void;
}

const tagColors = [
  { name: "Rose", value: "#f15bb5" },
  { name: "Mauve", value: "#c084fc" },
  { name: "Pink", value: "#f15bb5" },
  { name: "Yellow", value: "#fee440" },
  { name: "Red", value: "#ef233c" },
  { name: "Green", value: "#06d6a0" },
  { name: "Blue", value: "#118ab2" },
  { name: "Orange", value: "#ff9f1c" },
];

type Tab = "settings" | "tags" | "folders";

const tabs: { id: Tab; label: string }[] = [
  { id: "settings", label: "SETTINGS" },
  { id: "tags", label: "TAGS" },
  { id: "folders", label: "FOLDERS" },
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
  onReorderTags,
  onReorderCollections,
}: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagColors[0].value);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState(tagColors[1].value);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDropTags = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex || !onReorderTags) return;
    const reordered = [...tags];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorderTags(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDropCollections = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex || !onReorderCollections) return;
    const reordered = [...collections];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorderCollections(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div 
        className="relative z-10 w-full max-w-lg mx-4 bg-surface rounded-lg shadow-2xl overflow-hidden border border-border max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-rose to-mauve p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-dark font-mono">CONFIG_VAULT</h2>
            <button onClick={onClose} className="text-dark/70 hover:text-dark">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-mono rounded-t transition-all ${
                  activeTab === tab.id
                    ? "bg-dark text-rose"
                    : "text-dark/60 hover:text-dark hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === "settings" && (
            <div className="flex items-center justify-between py-4">
              <div>
                <h3 className="font-mono text-sm text-text">STEALTH_MODE</h3>
                <p className="text-xs text-dim font-mono">Hide media previews</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !showBlur;
                  onBlurChange(newValue);
                  onSaveSettings({ STEALTH_MODE: newValue });
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  showBlur ? "bg-rose" : "bg-border"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  showBlur ? "left-7" : "left-1"
                }`} />
              </button>
            </div>
          )}

          {activeTab === "tags" && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="TAG_NAME..."
                  className="flex-1 px-3 py-2 rounded bg-dark border border-border focus:border-rose outline-none font-mono text-sm text-text"
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                />
                <select
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="px-2 py-2 rounded bg-dark border border-border focus:border-rose outline-none font-mono text-sm"
                >
                  {tagColors.map((color) => (
                    <option key={color.value} value={color.value}>{color.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-rose/20 border border-rose/50 text-rose rounded font-mono text-sm hover:bg-rose/30"
                >
                  +
                </button>
              </div>

              <div className="space-y-2">
                {tags.map((tag, index) => (
                  <div
                    key={tag.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropTags(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 bg-dark rounded border transition-all cursor-grab active:cursor-grabbing ${
                      dragOverIndex === index ? 'border-rose border-2' : 'border-border'
                    } ${dragIndex === index ? 'opacity-40' : ''}`}
                  >
                    <div className="text-muted text-xs shrink-0 cursor-grab">⠿</div>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    
                    {editingTag === tag.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-surface border border-border outline-none font-mono text-sm text-text"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(tag.id)}
                        />
                        <select
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="px-1 py-1 rounded bg-surface border border-border outline-none font-mono text-xs"
                        >
                          {tagColors.map((c) => (
                            <option key={c.value} value={c.value}>{c.name}</option>
                          ))}
                        </select>
                        <button onClick={() => handleSaveEdit(tag.id)} className="text-rose hover:text-rose/70">
                          ✓
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-mono text-sm text-text truncate">{tag.name}</span>
                        <span className="text-xs text-dim font-mono shrink-0">({tag.count})</span>
                        <button onClick={() => handleStartEdit(tag)} className="text-mauve hover:text-mauve/70 shrink-0">
                          ✎
                        </button>
                        <button onClick={() => onDeleteTag(tag.id)} className="text-red-400 hover:text-red-400/70 shrink-0">
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                ))}
                
                {tags.length === 0 && (
                  <p className="text-center text-dim font-mono text-xs py-4">NO_TAGS_INITIALIZED</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "folders" && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="FOLDER_NAME..."
                  className="flex-1 px-3 py-2 rounded bg-dark border border-border focus:border-mauve outline-none font-mono text-sm text-text"
                  onKeyDown={(e) => e.key === "Enter" && handleAddCollection()}
                />
                <select
                  value={newCollectionColor}
                  onChange={(e) => setNewCollectionColor(e.target.value)}
                  className="px-2 py-2 rounded bg-dark border border-border focus:border-mauve outline-none font-mono text-sm"
                >
                  {tagColors.map((color) => (
                    <option key={color.value} value={color.value}>{color.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddCollection}
                  className="px-3 py-2 bg-mauve/20 border border-mauve/50 text-mauve rounded font-mono text-sm hover:bg-mauve/30"
                >
                  +
                </button>
              </div>

              <div className="space-y-2">
                {collections.map((col, index) => (
                  <div
                    key={col.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropCollections(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-2 bg-dark rounded border transition-all cursor-grab active:cursor-grabbing ${
                      dragOverIndex === index ? 'border-mauve border-2' : 'border-border'
                    } ${dragIndex === index ? 'opacity-40' : ''}`}
                  >
                    <div className="text-muted text-xs shrink-0 cursor-grab">⠿</div>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="flex-1 font-mono text-sm text-text truncate">{col.name}</span>
                    <span className="text-xs text-dim font-mono shrink-0">({col.count ?? 0})</span>
                    <button onClick={() => onDeleteCollection?.(col.id)} className="text-red-400 hover:text-red-400/70 shrink-0">
                      ✕
                    </button>
                  </div>
                ))}
                
                {collections.length === 0 && (
                  <p className="text-center text-dim font-mono text-xs py-4">NO_FOLDERS_INITIALIZED</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3 flex-shrink-0">
          <div className="text-center text-dim text-xs font-mono">
            <p>HDATA_VAULT v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};
