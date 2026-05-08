"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { MediaItem, Tag, Collection, SearchOptions } from "@/types";
import {
  fetchFiles,
  fetchTags,
  fetchCollections,
  fetchSettings,
  uploadFile,
  deleteFile,
  saveTags,
  saveFileTags,
  saveCollections,
  saveFileCollection,
  saveSettings as saveSettingsApi,
} from "@/lib/api";
import {
  filterMediaItems,
  enrichCollections,
} from "@/lib/filters";

export function useMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    query: "",
    tags: [],
    tagMode: "AND",
  });
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBlur, setShowBlur] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [settings, setSettings] = useState({ STEALTH_MODE: false });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [files, tagsData, collectionsData, settingsData] =
        await Promise.all([
          fetchFiles(),
          fetchTags(),
          fetchCollections(),
          fetchSettings(),
        ]);
      if (cancelled) return;
      if (files.length > 0) setItems(files);
      if (tagsData.length > 0) setTags(tagsData);
      if (collectionsData.length > 0) setCollections(collectionsData);
      setSettings(settingsData);
      setShowBlur(settingsData.STEALTH_MODE);
      setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const updateTagsWithCounts = useCallback(
    (newTags: Tag[]) => {
      setTags(newTags);
      saveTags(newTags);
    },
    [],
  );

  const saveSettings = useCallback(
    async (newSettings: { STEALTH_MODE: boolean }) => {
      await saveSettingsApi(newSettings);
      setSettings(newSettings);
    },
    [],
  );

  const handleUpload = useCallback(async (file: File) => {
    const newItem = await uploadFile(file);
    if (newItem) {
      setItems((prev) => [newItem, ...prev]);
    }
  }, []);

  const handleDelete = useCallback(async (filename: string) => {
    const result = await deleteFile(filename);
    if (result?.success) {
      setItems((prev) => prev.filter((item) => item.filename !== filename));
      setSelectedItem(null);
    }
  }, []);

  const handleFilterChange = useCallback((filter: string) => {
    if (filter === "settings") {
      setShowSettings(true);
    } else {
      setActiveFilter(filter);
      setSearchQuery("");
    }
  }, []);

  const handleSearch = useCallback((options: SearchOptions) => {
    setSearchOptions(options);
  }, []);

  const addNewTag = useCallback(
    (name: string, color: string) => {
      const newTag: Tag = {
        id: Date.now().toString(),
        name,
        color,
        count: 0,
      };
      const updated = [...tags, newTag];
      updateTagsWithCounts(updated);
    },
    [tags, updateTagsWithCounts],
  );

  const deleteTag = useCallback(
    (id: string) => {
      const updated = tags.filter((tag) => tag.id !== id);
      updateTagsWithCounts(updated);
    },
    [tags, updateTagsWithCounts],
  );

  const updateTag = useCallback(
    (id: string, name: string, color: string) => {
      const updated = tags.map((tag) =>
        tag.id === id ? { ...tag, name, color } : tag,
      );
      updateTagsWithCounts(updated);
    },
    [tags, updateTagsWithCounts],
  );

  const addNewCollection = useCallback(
    (name: string, color: string) => {
      const newCollection: Collection = {
        id: Date.now().toString(),
        name,
        color,
      };
      const updated = [...collections, newCollection];
      setCollections(updated);
      saveCollections(updated);
    },
    [collections],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      const updated = collections.filter((c) => c.id !== id);
      setCollections(updated);
      saveCollections(updated);
    },
    [collections],
  );

  const addTagToItem = useCallback(
    async (tagName: string) => {
      if (!selectedItem) return;
      const currentTags = selectedItem.tags || [];
      if (currentTags.includes(tagName)) return;
      const newTags = [...currentTags, tagName];

      const result = await saveFileTags(selectedItem.filename, newTags);
      if (!result?.success) return;

      setItems((prev) =>
        prev.map((item) =>
          item.filename === selectedItem.filename
            ? { ...item, tags: newTags }
            : item,
        ),
      );
      setSelectedItem({ ...selectedItem, tags: newTags });

      const updatedTags = tags.map((tag) =>
        tag.name === tagName ? { ...tag, count: tag.count + 1 } : tag,
      );
      updateTagsWithCounts(updatedTags);
    },
    [selectedItem, tags, updateTagsWithCounts],
  );

  const removeTagFromItem = useCallback(
    async (tagName: string) => {
      if (!selectedItem) return;
      const currentTags = selectedItem.tags || [];
      const newTags = currentTags.filter((t) => t !== tagName);

      const result = await saveFileTags(selectedItem.filename, newTags);
      if (!result?.success) return;

      setItems((prev) =>
        prev.map((item) =>
          item.filename === selectedItem.filename
            ? { ...item, tags: newTags }
            : item,
        ),
      );
      setSelectedItem({ ...selectedItem, tags: newTags });

      const updatedTags = tags.map((tag) =>
        tag.name === tagName
          ? { ...tag, count: Math.max(0, tag.count - 1) }
          : tag,
      );
      updateTagsWithCounts(updatedTags);
    },
    [selectedItem, tags, updateTagsWithCounts],
  );

  const addToCollection = useCallback(
    async (collectionId: string) => {
      if (!selectedItem) return;

      const result = await saveFileCollection(
        selectedItem.filename,
        collectionId,
      );
      if (!result?.success) return;

      setItems((prev) =>
        prev.map((item) =>
          item.filename === selectedItem.filename
            ? { ...item, collection: collectionId }
            : item,
        ),
      );
      setSelectedItem({ ...selectedItem, collection: collectionId });
    },
    [selectedItem],
  );

  const removeFromCollection = useCallback(async () => {
    if (!selectedItem) return;

    const result = await saveFileCollection(selectedItem.filename, null);
    if (!result?.success) return;

    setItems((prev) =>
      prev.map((item) =>
        item.filename === selectedItem.filename
          ? { ...item, collection: null, collectionName: null }
          : item,
      ),
    );
    setSelectedItem({
      ...selectedItem,
      collection: null,
      collectionName: null,
    });
  }, [selectedItem]);

  const handleItemClick = useCallback(
    (item: MediaItem) => {
      const baseName = item.filename.replace(/\.[^/.]+$/, "");
      if (item.mimetype === "image/jpeg") {
        const videoFile = items.find(
          (i) =>
            i.filename.replace(/\.[^/.]+$/, "") === baseName &&
            /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(i.filename),
        );
        if (videoFile) {
          setSelectedItem(videoFile);
          return;
        }
      }
      setSelectedItem(item);
    },
    [items],
  );

  const filteredItems = useMemo(
    () =>
      enrichCollections(
        filterMediaItems(items, activeFilter, searchOptions),
        collections,
      ),
    [items, activeFilter, searchOptions, collections],
  );

  return {
    items,
    isLoading,
    searchQuery,
    searchOptions,
    activeFilter,
    selectedItem,
    showSettings,
    showMobileMenu,
    showBlur,
    tags,
    collections,
    settings,
    filteredItems,
    handleUpload,
    handleDelete,
    handleFilterChange,
    handleSearch,
    handleItemClick,
    setShowMobileMenu,
    setShowSettings,
    setShowBlur,
    setSelectedItem,
    addNewTag,
    deleteTag,
    updateTag,
    addNewCollection,
    deleteCollection,
    addTagToItem,
    removeTagFromItem,
    addToCollection,
    removeFromCollection,
    saveSettings,
  };
}
