"use client";

import { useState, useEffect } from "react";
import { Header } from "./components/Header/Header";
import { SidePanel } from "./components/SidePanel/SidePanel";
import { Workspace } from "./components/Workspace/Workspace";
import { Modal } from "./components/Modal/Modal";
import { Settings } from "./components/Settings/Settings";

const isAndroidEmulator = typeof window !== 'undefined' && navigator.userAgent.includes('Android');
const API_URL = isAndroidEmulator ? "http://10.0.2.2:3001" : "http://172.16.0.2:3001";

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
  createdAt?: string;
}

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

export default function Home() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  interface SearchOptions {
    query: string;
    tags: string[];
    tagMode: 'AND' | 'OR';
    dateFrom?: string;
    dateTo?: string;
    sizeMin?: number;
    sizeMax?: number;
  }

  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    query: '',
    tags: [],
    tagMode: 'AND',
  });
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [settings, setSettings] = useState({ STEALTH_MODE: false });

  const saveSettings = async (newSettings: { STEALTH_MODE: boolean }) => {
    try {
      await fetch(`${API_URL}/uploads/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      setSettings(newSettings);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const filesRes = await fetch(`${API_URL}/uploads`);
        const tagsRes = await fetch(`${API_URL}/uploads/tags`);
        const settingsRes = await fetch(`${API_URL}/uploads/settings`);
        
        if (filesRes.ok) {
          const data = await filesRes.json();
          if (Array.isArray(data)) {
            setItems(data);
          }
        }
        
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData);
        }

        const collectionsRes = await fetch(`${API_URL}/uploads/collections`);
        if (collectionsRes.ok) {
          const collectionsData = await collectionsRes.json();
          setCollections(collectionsData);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
          setShowBlur(settingsData.STEALTH_MODE);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/uploads`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newItem = await res.json();
        setItems((prev) => [newItem, ...prev]);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const res = await fetch(`${API_URL}/uploads/${filename}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.filename !== filename));
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleFilterChange = (filter: string) => {
    if (filter === "settings") {
      setShowSettings(true);
    } else {
      setActiveFilter(filter);
      setSearchQuery("");
    }
  };

  const handleSearch = (options: SearchOptions) => {
    setSearchOptions(options);
  };

  const saveTagsToBackend = async (newTags: Tag[]) => {
    try {
      await fetch(`${API_URL}/uploads/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
    } catch (err) {
      console.error("Failed to save tags:", err);
    }
  };

  const addNewTag = (name: string, color: string) => {
    const newTag: Tag = {
      id: Date.now().toString(),
      name,
      color,
      count: 0,
    };
    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    saveTagsToBackend(updatedTags);
  };

  const deleteTag = (id: string) => {
    const updatedTags = tags.filter((tag) => tag.id !== id);
    setTags(updatedTags);
    saveTagsToBackend(updatedTags);
  };

  const updateTag = (id: string, name: string, color: string) => {
    const updatedTags = tags.map((tag) => 
      tag.id === id ? { ...tag, name, color } : tag
    );
    setTags(updatedTags);
    saveTagsToBackend(updatedTags);
  };

  const saveCollectionsToBackend = async (newCollections: Collection[]) => {
    try {
      await fetch(`${API_URL}/uploads/collections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collections: newCollections }),
      });
    } catch (err) {
      console.error("Failed to save collections:", err);
    }
  };

  const addNewCollection = (name: string, color: string) => {
    const newCollection: Collection = {
      id: Date.now().toString(),
      name,
      color,
    };
    const updatedCollections = [...collections, newCollection];
    setCollections(updatedCollections);
    saveCollectionsToBackend(updatedCollections);
  };

  const deleteCollection = (id: string) => {
    const updatedCollections = collections.filter((c) => c.id !== id);
    setCollections(updatedCollections);
    saveCollectionsToBackend(updatedCollections);
  };

  const updateCollection = (id: string, name: string, color: string) => {
    const updatedCollections = collections.map((c) => 
      c.id === id ? { ...c, name, color } : c
    );
    setCollections(updatedCollections);
    saveCollectionsToBackend(updatedCollections);
  };

  const addTagToItem = async (tagName: string) => {
    if (!selectedItem) return;
    
    const currentTags = selectedItem.tags || [];
    if (currentTags.includes(tagName)) return;
    
    const newTags = [...currentTags, tagName];
    
    try {
      const res = await fetch(`${API_URL}/uploads/${encodeURIComponent(selectedItem.filename)}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
      
      if (res.ok) {
        setItems((prev) => prev.map((item) => 
          item.filename === selectedItem.filename ? { ...item, tags: newTags } : item
        ));
        
        setSelectedItem({ ...selectedItem, tags: newTags });
        
        const updatedTags = tags.map((tag) => 
          tag.name === tagName ? { ...tag, count: tag.count + 1 } : tag
        );
        setTags(updatedTags);
        saveTagsToBackend(updatedTags);
      }
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const removeTagFromItem = async (tagName: string) => {
    if (!selectedItem) return;
    
    const currentTags = selectedItem.tags || [];
    const newTags = currentTags.filter(t => t !== tagName);
    
    try {
      const res = await fetch(`${API_URL}/uploads/${encodeURIComponent(selectedItem.filename)}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
      
      if (res.ok) {
        setItems((prev) => prev.map((item) => 
          item.filename === selectedItem.filename ? { ...item, tags: newTags } : item
        ));
        setSelectedItem({ ...selectedItem, tags: newTags });
        
        const updatedTags = tags.map((tag) => 
          tag.name === tagName ? { ...tag, count: Math.max(0, tag.count - 1) } : tag
        );
        setTags(updatedTags);
        saveTagsToBackend(updatedTags);
      }
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const addToCollection = async (collectionId: string) => {
    if (!selectedItem) return;
    
    try {
      const res = await fetch(`${API_URL}/uploads/${encodeURIComponent(selectedItem.filename)}/collection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      });
      
      if (res.ok) {
        setItems((prev) => prev.map((item) => 
          item.filename === selectedItem.filename ? { ...item, collection: collectionId } : item
        ));
        setSelectedItem({ ...selectedItem, collection: collectionId });
      }
    } catch (err) {
      console.error("Failed to add to collection:", err);
    }
  };

  const removeFromCollection = async () => {
    if (!selectedItem) return;
    
    try {
      const res = await fetch(`${API_URL}/uploads/${encodeURIComponent(selectedItem.filename)}/collection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: null }),
      });
      
      if (res.ok) {
        setItems((prev) => prev.map((item) => 
          item.filename === selectedItem.filename ? { ...item, collection: null, collectionName: null } : item
        ));
        setSelectedItem({ ...selectedItem, collection: null, collectionName: null });
      }
    } catch (err) {
      console.error("Failed to remove from collection:", err);
    }
  };

  const getFilteredItems = () => {
    let filtered = items;
    
    if (activeFilter !== 'videos') {
      filtered = filtered.filter(i => i.mimetype !== 'image/jpeg' || !items.some(v => 
        v.filename.replace(/\.[^/.]+$/, '') === i.filename.replace(/\.[^/.]+$/, '') &&
        /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(v.filename)
      ));
    }
    
    if (searchOptions.query) {
      filtered = filtered.filter(item => 
        item.originalName.toLowerCase().includes(searchOptions.query.toLowerCase()) ||
        item.filename.toLowerCase().includes(searchOptions.query.toLowerCase())
      );
    }
    
    if (searchOptions.tags.length > 0) {
      const hasNoTags = searchOptions.tags.includes('@NoTags');
      const hasNoCollection = searchOptions.tags.includes('@NoCollection');
      if (hasNoTags && hasNoCollection) {
        filtered = filtered.filter(item => (!item.tags || item.tags.length === 0) && !item.collection);
      } else if (hasNoTags) {
        filtered = filtered.filter(item => !item.tags || item.tags.length === 0);
      } else if (hasNoCollection) {
        filtered = filtered.filter(item => !item.collection);
      } else if (searchOptions.tagMode === 'AND') {
        filtered = filtered.filter(item => 
          searchOptions.tags.every(tag => item.tags?.includes(tag))
        );
      } else {
        filtered = filtered.filter(item => 
          searchOptions.tags.some(tag => item.tags?.includes(tag))
        );
      }
    }
    
    if (searchOptions.dateFrom) {
      const fromDate = new Date(searchOptions.dateFrom);
      filtered = filtered.filter(item => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate >= fromDate;
      });
    }
    
    if (searchOptions.dateTo) {
      const toDate = new Date(searchOptions.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate <= toDate;
      });
    }
    
    if (searchOptions.sizeMin !== undefined) {
      filtered = filtered.filter(item => item.size >= searchOptions.sizeMin!);
    }
    
    if (searchOptions.sizeMax !== undefined) {
      filtered = filtered.filter(item => item.size <= searchOptions.sizeMax!);
    }
    
    switch (activeFilter) {
      case "all":
        break;
      case "images":
        filtered = filtered.filter(item => {
          const hasVideoSibling = items.some(i => 
            i.filename.replace(/\.[^/.]+$/, '') === item.filename.replace(/\.[^/.]+$/, '') &&
            /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(i.filename)
          );
          return item.mimetype.startsWith("image/") && !hasVideoSibling;
        });
        break;
      case "videos":
        filtered = items.filter(item => {
          const isVideoFile = /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(item.filename);
          return isVideoFile;
        });
        break;
      case "docs":
        filtered = filtered.filter(item => 
          item.mimetype.startsWith("application/") || 
          ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "7z", "txt", "json", "xml", "html", "css", "js", "ts"].some(ext => item.filename.toLowerCase().endsWith(ext))
        );
        break;
      default:
        if (activeFilter.startsWith('collection:')) {
          const collectionId = activeFilter.replace('collection:', '');
          filtered = filtered.filter(item => item.collection === collectionId);
        }
        break;
    }
    
    return filtered;
  };

  const getItemsWithCollectionName = () => {
    return getFilteredItems().map(item => ({
      ...item,
      collectionName: item.collection ? collections.find(c => c.id === item.collection)?.name || null : null
    }));
  };

  return (
    <div className="flex flex-col md:grid md:grid-cols-[88px_1fr] h-screen">
      <div className="hidden md:flex">
        <SidePanel 
          activeFilter={activeFilter} 
          onFilterChange={handleFilterChange}
          collections={collections}
        />
      </div>
      <div className="flex flex-col h-full overflow-hidden z-0">
        <div className="md:hidden flex items-center justify-between px-2 py-2 bg-[#12121a] border-b border-[#2a2a3a] relative z-40">
          <span className="text-base font-bold text-[#00f5d4]">HDATA</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-[#8a8a9a]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-[#8a8a9a]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.804 2.885 2.165a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.804 3.31-2.165 2.885a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.804-2.885-2.165a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.804-3.31 2.165-2.885a1.724 1.724 0 002.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        {showMobileMenu && (
          <div className="md:hidden fixed top-10 left-0 right-0 bg-[#12121a] border-b border-[#2a2a3a] z-[100] max-h-48 overflow-y-auto shadow-lg">
            <button
              onClick={() => { handleFilterChange('all'); setShowMobileMenu(false); }}
              className={`w-full px-4 py-2 text-left text-sm font-mono ${activeFilter === 'all' ? 'text-[#00f5d4] bg-[#00f5d4]/10' : 'text-[#8a8a9a]'}`}
            >
              ALL
            </button>
            <button
              onClick={() => { handleFilterChange('images'); setShowMobileMenu(false); }}
              className={`w-full px-4 py-2 text-left text-sm font-mono ${activeFilter === 'images' ? 'text-[#00f5d4] bg-[#00f5d4]/10' : 'text-[#8a8a9a]'}`}
            >
              IMAGES
            </button>
            <button
              onClick={() => { handleFilterChange('videos'); setShowMobileMenu(false); }}
              className={`w-full px-4 py-2 text-left text-sm font-mono ${activeFilter === 'videos' ? 'text-[#00f5d4] bg-[#00f5d4]/10' : 'text-[#8a8a9a]'}`}
            >
              VIDEOS
            </button>
            <button
              onClick={() => { handleFilterChange('documents'); setShowMobileMenu(false); }}
              className={`w-full px-4 py-2 text-left text-sm font-mono ${activeFilter === 'documents' ? 'text-[#00f5d4] bg-[#00f5d4]/10' : 'text-[#8a8a9a]'}`}
            >
              DOCUMENTS
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => { handleFilterChange(`collection:${col.id}`); setShowMobileMenu(false); }}
                className={`w-full px-4 py-2 text-left text-sm font-mono flex items-center gap-2 ${activeFilter === `collection:${col.id}` ? 'text-[#9b5de5] bg-[#9b5de5]/10' : 'text-[#8a8a9a]'}`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                {col.name}
              </button>
            ))}
          </div>
        )}
        <Header onUpload={handleUpload} onSearch={handleSearch} tags={tags} />
        <Workspace 
          items={getItemsWithCollectionName()}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onItemClick={(item) => {
            const baseName = item.filename.replace(/\.[^/.]+$/, '');
            const isThumb = item.mimetype === 'image/jpeg';
            if (isThumb) {
              const videoFile = items.find(i => 
                i.filename.replace(/\.[^/.]+$/, '') === baseName &&
                /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(i.filename)
              );
              if (videoFile) {
                setSelectedItem(videoFile);
                return;
              }
            }

            setSelectedItem(item);
          }}
          showBlur={showBlur}
          tags={tags}
        />
      </div>

      {selectedItem && (
        <Modal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
          tags={tags}
          onAddTag={addTagToItem}
          onRemoveTag={removeTagFromItem}
          collections={collections}
          onAddToCollection={addToCollection}
          onRemoveFromCollection={removeFromCollection}
        />
      )}

      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        showBlur={showBlur}
        onBlurChange={setShowBlur}
        tags={tags}
        onAddTag={addNewTag}
        onDeleteTag={deleteTag}
        onUpdateTag={updateTag}
        onSaveSettings={saveSettings}
        collections={collections}
        onAddCollection={addNewCollection}
        onDeleteCollection={deleteCollection}
      />
    </div>
  );
}