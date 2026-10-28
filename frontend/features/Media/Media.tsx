"use client";

/* Медиатека (/media). Галерея с табами, фильтрацией по тегам/коллекциям,
   сортировкой, drag-and-drop upload, модалкой предпросмотра и CRUD тегов/коллекций. */
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Tag, Collection, TagMedia, CollectionMedia, Tab, FileItem, CollectionGroup, FileGroup } from "@/lib/types";
import { filesApi, tagsApi, tagMediaApi, collectionsApi, collectionMediaApi, groupsApi, groupMediaApi, loadAllMetadata } from "@/lib/api";
import FilterDropdown from "@/components/FilterDropdown";
import AssignModal from "./AssignModal";
import GifScrubber from "./GifScrubber";

const COLORS = ["#22c55e","#f59e0b","#3b82f6","#ef4444","#ec4899","#8b5cf6"];

const TAB_LABELS: { value: Tab; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "img", label: "Фото" },
  { value: "video", label: "Видео" },
  { value: "gif", label: "GIF" },
];

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const Media = () => {
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<string | null>(null);

  /* режим галереи: просмотр (клик → модалка) / выбор (клик → выделение) */
  const [mode, setMode] = useState<"view" | "select">("view");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNoTags, setShowNoTags] = useState(false);
  const [showNoCollections, setShowNoCollections] = useState(false);
  const [assignModal, setAssignModal] = useState<{ mode: "tags" | "collections" | "groups"; action: "add" | "remove" } | null>(null);
  const [applying, setApplying] = useState(false);

  /* file list from backend */
  const [files, setFiles] = useState<FileItem[]>([]);

  /* tag / collection state */
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tagMedia, setTagMedia] = useState<TagMedia[]>([]);
  const [collectionMedia, setCollectionMedia] = useState<CollectionMedia[]>([]);
  const [collectionGroups, setCollectionGroups] = useState<CollectionGroup[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [drawer, setDrawer] = useState<"tags" | "collections" | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  /* modal search state */
  const [tagQuery, setTagQuery] = useState("");
  const [collectionQuery, setCollectionQuery] = useState("");

  /* modal sidebar visibility (mobile toggle) */
  const [showModalSidebar, setShowModalSidebar] = useState(false);

  /* filter state */
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterCollectionIds, setFilterCollectionIds] = useState<string[]>([]);
  const [filterGroupIds, setFilterGroupIds] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<"and" | "or" | "not">("or");
  const [groupFilterMode, setGroupFilterMode] = useState<"and" | "or" | "not">("or");

  /* sort */
  const [sortMode, setSortMode] = useState<"date" | "size">("date");
  const [sortAsc, setSortAsc] = useState(true);

  /* blur setting from localStorage */
  /* Blur из localStorage */
  const [blurMedia, setBlurMedia] = useState(false);

  useEffect(() => {
    setBlurMedia(localStorage.getItem("hdata:blurMedia") === "true"); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  /* upload state */
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Загрузить все данные: файлы + теги + коллекции + связи.
     Вызывается после каждого CRUD-действия. */
  const load = async () => {
    const [fileData, meta] = await Promise.all([
      filesApi.list(),
      loadAllMetadata(),
    ]);
    setFiles(fileData);
    setTags(meta.tags);
    setCollections(meta.collections);
    setTagMedia(meta.tagMedia);
    setCollectionMedia(meta.collectionMedia);
    setFileGroups(meta.groupMedia);
    const allGroups: CollectionGroup[] = [];
    for (const c of meta.collections) {
      try {
        const g = await groupsApi.list(c.id);
        allGroups.push(...g);
      } catch {}
    }
    setCollectionGroups(allGroups);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {});
  }, []);

  /* CRUD: создание/удаление тегов/коллекций, управление связями */
  const addEntity = async (kind: "tags" | "collections") => {
    const name = newName.trim();
    if (!name) return;
    const exists = (kind === "tags" ? tags : collections).some((t) => t.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    if (kind === "tags") await tagsApi.create(name, COLORS[tags.length % COLORS.length]);
    else await collectionsApi.create(name);
    setNewName("");
    await load();
  };

  /* Создание тега/коллекции из поля поиска (если не существует) */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const addEntityByName = async (kind: "tags" | "collections", name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = (kind === "tags" ? tags : collections).some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    if (kind === "tags") await tagsApi.create(trimmed, COLORS[tags.length % COLORS.length]);
    else await collectionsApi.create(trimmed);
    setNewName("");
    await load();
  };

  const delEntity = async (kind: "tags" | "collections", id: string) => {
    if (kind === "tags") await tagsApi.delete(id);
    else await collectionsApi.delete(id);
    await load();
  };

  const renameEntity = async (kind: "tags" | "collections", id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return setEditingId(null);
    const existing = (kind === "tags" ? tags : collections).find((t) => t.id === id);
    if (!existing || existing.name === trimmed) { setEditingId(null); return; }
    if (kind === "tags") {
      await tagsApi.update(id, trimmed, (existing as Tag).color);
    } else {
      await collectionsApi.update(id, trimmed);
    }
    setEditingId(null);
    await load();
  };

  const renameGroup = async (collectionId: string, id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) { setEditingId(null); return; }
    const existing = collectionGroups.find((g) => g.id === id);
    if (!existing || existing.name === trimmed) { setEditingId(null); return; }
    await groupsApi.update(collectionId, id, trimmed);
    setEditingId(null);
    const fresh = await groupsApi.list(collectionId);
    setCollectionGroups((prev) => [...prev.filter((x) => x.collectionId !== collectionId), ...fresh]);
  };

  /* Переключение связи: создать или удалить */
  const toggleLink = async (kind: "tags-media" | "collections-media", fileId: string, id: string) => {
    const exists = kind === "tags-media"
      ? tagMedia.some((e) => e.fileId === fileId && e.tagId === id)
      : collectionMedia.some((e) => e.fileId === fileId && e.collectionId === id);
    if (exists) {
      if (kind === "tags-media") await tagMediaApi.unlink(fileId, id);
      else await collectionMediaApi.unlink(fileId, id);
    } else {
      if (kind === "tags-media") await tagMediaApi.link(fileId, id);
      else await collectionMediaApi.link(fileId, id);
    }
    await load();
  };

  /* Определение типа и загрузка файла напрямую на BACKEND_BASE */
  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type = ["mp4", "webm", "mov"].includes(ext) ? "video"
      : ext === "gif" ? "gif" : "img";
    await filesApi.upload(file, type);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
        setUploadProgress({ done: i + 1, total: files.length });
      }
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка загрузки";
      setUploadError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
        setUploadProgress({ done: i + 1, total: files.length });
      }
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка загрузки";
      setUploadError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    await filesApi.delete(id);
    setSelected(null);
    await load();
  };

  /* Режим выбора: переключение режима сбрасывает выделение */
  const switchMode = (m: "view" | "select") => {
    setMode(m);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* Массовое назначение тегов/коллекций/групп выделенным файлам */
  const applyAssign = async (ids: string[]) => {
    if (!assignModal || selectedIds.size === 0 || ids.length === 0) return;
    setApplying(true);
    try {
      const fileIds = Array.from(selectedIds);
      if (assignModal.mode === "tags") {
        await tagMediaApi.bulkLink(fileIds, ids);
      } else if (assignModal.mode === "collections") {
        await collectionMediaApi.bulkLink(fileIds, ids);
      } else if (assignModal.action === "add") {
        await groupMediaApi.bulkLink(fileIds, ids);
      } else {
        for (const fileId of fileIds) {
          for (const groupId of ids) {
            await groupMediaApi.unlink(fileId, groupId);
          }
        }
      }
      await load();
      setAssignModal(null);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  /* Массовое удаление выделенных файлов */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Удалить ${selectedIds.size} файлов?`)) return;
    for (const id of selectedIds) {
      await filesApi.delete(id);
    }
    setSelectedIds(new Set());
    await load();
  };

  /* Фильтрация + сортировка на клиенте */
  const filtered = files
    .filter((f) => tab === "all" || f.type === tab)
    .filter((f) => !showNoTags || !tagMedia.some((tm) => tm.fileId === f.id))
    .filter((f) => !showNoCollections || !collectionMedia.some((cm) => cm.fileId === f.id))
    .filter((f) => {
      if (filterCollectionIds.length === 0) return true;
      const fc = new Set(collectionMedia.filter((cm) => cm.fileId === f.id).map((cm) => cm.collectionId));
      return filterCollectionIds.every((cid) => fc.has(cid));
    })
    .filter((f) => {
      if (filterTagIds.length === 0) return true;
      const ft = new Set(tagMedia.filter((tm) => tm.fileId === f.id).map((tm) => tm.tagId));
      if (tagFilterMode === "and") return filterTagIds.every((tid) => ft.has(tid));
      if (tagFilterMode === "or") return filterTagIds.some((tid) => ft.has(tid));
      return filterTagIds.every((tid) => !ft.has(tid));
    })
    .filter((f) => {
      if (filterGroupIds.length === 0) return true;
      const fg = new Set(fileGroups.filter((fg) => fg.fileId === f.id).map((fg) => fg.groupId));
      if (groupFilterMode === "and") return filterGroupIds.every((gid) => fg.has(gid));
      if (groupFilterMode === "or") return filterGroupIds.some((gid) => fg.has(gid));
      return filterGroupIds.every((gid) => !fg.has(gid));
    })
    .sort((a, b) => {
      const cmp = sortMode === "date"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : (a.size ?? 0) - (b.size ?? 0);
      return sortAsc ? cmp : -cmp;
    });

  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));

  /* Escape */
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const selectedFile = selected ? files.find((f) => f.id === selected) : null;

  /* Виртуализация сетки: в DOM только видимые ряды.
     Колонки и высота ряда считаются по реальной ширине контейнера,
     иначе квадратные плитки обрежутся на нестандартных экранах. */
  const gridRef = useRef<HTMLDivElement>(null);
  const headerWrapRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      setGridWidth(el.clientWidth);
      setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [headerHeight]);

  /* Шапка fixed: измеряем её высоту, чтобы сетка начиналась ниже неё */
  useEffect(() => {
    const el = headerWrapRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = gridWidth >= 768 ? 4 : gridWidth >= 640 ? 3 : 2;
  const gap = gridWidth >= 640 ? 16 : 8;
  const rowCount = Math.ceil(filtered.length / columns);
  const rowHeight = gridWidth > 0 ? (gridWidth - gap * (columns - 1)) / columns + 52 + gap : 280;

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin,
  });

  const header = (
    <header className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-800 flex-wrap">
      <Link href="/" className="text-xs sm:text-sm text-gray-400 hover:text-gray-200 transition whitespace-nowrap">&larr; Медиатека</Link>
      <nav className="flex gap-1 sm:gap-2 text-xs sm:text-sm">
        {TAB_LABELS.map(({ value, label }) => (
          <button key={value} onClick={() => setTab(value)} className={`rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 border transition ${tab === value ? "bg-blue-600 border-blue-500" : "bg-gray-900 border-gray-800 hover:border-blue-500"}`}>
            {label}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
        {/* Режим: просмотр / выбор */}
        <div className="flex gap-0.5 rounded-lg bg-gray-900 border border-gray-700 overflow-hidden">
          <button onClick={() => switchMode("view")} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium transition ${mode === "view" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`} title="Просмотр: клик открывает файл">👁</button>
          <button onClick={() => switchMode("select")} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium transition ${mode === "select" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`} title="Выбор: клик выделяет файлы для массовых операций">☑</button>
        </div>
        {/* Upload */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          accept="image/*,video/*,.gif"
          multiple
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-green-600 px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium hover:bg-green-500 transition disabled:opacity-50 whitespace-nowrap"
        >
          {uploading && uploadProgress ? `${uploadProgress.done}/${uploadProgress.total}` : uploading ? "Загрузка..." : "+ Загрузить"}
        </button>
        {uploadError && (
          <span className="text-xs text-red-400 max-w-24 sm:max-w-48 truncate" title={uploadError}>{uploadError}</span>
        )}
        <button onClick={() => setDrawer(drawer === "tags" ? null : "tags")} className={`hidden sm:inline transition ${drawer === "tags" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"}`} title="Теги">
          🏷️ <span>Теги</span>
        </button>
        <button onClick={() => setDrawer(drawer === "collections" ? null : "collections")} className={`hidden sm:inline transition ${drawer === "collections" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"}`} title="Коллекции">
          📂 <span>Коллекции</span>
        </button>
        {/* mobile drawer toggles */}
        <button onClick={() => setDrawer(drawer === "tags" ? null : "tags")} className={`sm:hidden transition ${drawer === "tags" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"}`} title="Теги">🏷️</button>
        <button onClick={() => setDrawer(drawer === "collections" ? null : "collections")} className={`sm:hidden transition ${drawer === "collections" ? "text-blue-400" : "text-gray-400 hover:text-gray-200"}`} title="Коллекции">📂</button>
        <span className="text-gray-500 hidden sm:inline">Сортировка:</span>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} className="rounded-lg bg-gray-900 border border-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-200 outline-none">
          <option value="date">По дате</option>
          <option value="size">По размеру</option>
        </select>
        <button onClick={() => setSortAsc(!sortAsc)} className="text-gray-400 hover:text-gray-200 transition text-base sm:text-lg px-2 py-1 select-none" title={sortAsc ? "По возрастанию" : "По убыванию"}>
          {sortAsc ? "↑" : "↓"}
        </button>
        <button
          onClick={() => {
            if (filtered.length > 0) {
              const pick = filtered[Math.floor(Math.random() * filtered.length)];
              setSelected(pick.id);
            }
          }}
          disabled={filtered.length === 0}
          className="rounded-lg bg-purple-600 px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium hover:bg-purple-500 transition disabled:opacity-50 whitespace-nowrap"
        >
          🎲 Random
        </button>
      </div>
    </header>
  );

  return (
    <div
      className="min-h-full bg-gray-950 text-gray-100 flex flex-col relative"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="fixed inset-0 z-[100] bg-blue-600/20 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900/90 px-6 sm:px-8 py-4 sm:py-6 rounded-2xl border border-blue-500/50 shadow-2xl">
            <p className="text-lg sm:text-2xl font-semibold text-blue-400">📁 Отпустите для загрузки</p>
          </div>
        </div>
      )}
      <div ref={headerWrapRef} className="fixed top-0 inset-x-0 z-30 bg-gray-950">
      {header}
      {/* tag/collection/group filter dropdowns */}
      <div className="flex gap-1.5 sm:gap-3 text-xs sm:text-sm items-center px-3 sm:px-6 py-2 border-b border-gray-800/60 flex-wrap">
      <button onClick={() => { setShowNoTags(!showNoTags); setSelectedIds(new Set()); }} className={`rounded-full px-2 sm:px-3 py-1 sm:py-1.5 border transition text-[10px] sm:text-xs whitespace-nowrap ${showNoTags ? "bg-orange-600/30 border-orange-500 text-orange-300" : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-500"}`}>
        🏷️ Без тегов
      </button>
      <button onClick={() => { setShowNoCollections(!showNoCollections); setSelectedIds(new Set()); }} className={`rounded-full px-2 sm:px-3 py-1 sm:py-1.5 border transition text-[10px] sm:text-xs whitespace-nowrap ${showNoCollections ? "bg-orange-600/30 border-orange-500 text-orange-300" : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-500"}`}>
        📂 Без коллекций
      </button>
      <FilterDropdown<Tag>
        icon="🏷️" label="Тег" items={tags}
        selectedIds={filterTagIds}
        onToggle={(id) => setFilterTagIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
        onClear={() => setFilterTagIds([])}
        getLabel={(t) => t.name}
        getPrefix={(t) => <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: t.color }} />}
        className=""
      />
      {filterTagIds.length > 0 && (
        <div className="flex gap-0.5 rounded-lg bg-gray-900 border border-gray-700 overflow-hidden">
          {(["or", "and", "not"] as const).map((mode) => (
            <button key={mode} onClick={() => setTagFilterMode(mode)} className={`px-2 py-1.5 text-[11px] font-medium transition ${tagFilterMode === mode ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
              {mode === "or" ? "ИЛИ" : mode === "and" ? "И" : "БЕЗ"}
            </button>
          ))}
        </div>
      )}
      <FilterDropdown<Collection>
        icon="📂" label="Коллекция" items={collections}
        selectedIds={filterCollectionIds}
        onToggle={(id) => setFilterCollectionIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
        onClear={() => setFilterCollectionIds([])}
        getLabel={(c) => c.name}
        className=""
      />
      <FilterDropdown<CollectionGroup>
        icon="🔸" label="Группа" items={filterCollectionIds.length > 0 ? collectionGroups.filter((g) => filterCollectionIds.includes(g.collectionId)) : collectionGroups}
        selectedIds={filterGroupIds}
        onToggle={(id) => setFilterGroupIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
        onClear={() => setFilterGroupIds([])}
        onSelectAll={(ids) => setFilterGroupIds((prev) => [...new Set([...prev, ...ids])])}
        getLabel={(g) => g.name}
        getPreviewUrl={(g) => { const fg = fileGroups.find((f) => f.groupId === g.id); return fg ? filesApi.thumbnailUrl(fg.fileId) : null; }}
      />
      {filterGroupIds.length > 0 && (
        <div className="flex gap-0.5 rounded-lg bg-gray-900 border border-gray-700 overflow-hidden">
          {(["or", "and", "not"] as const).map((mode) => (
            <button key={mode} onClick={() => setGroupFilterMode(mode)} className={`px-2 py-1.5 text-[11px] font-medium transition ${groupFilterMode === mode ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
              {mode === "or" ? "ИЛИ" : mode === "and" ? "И" : "БЕЗ"}
            </button>
          ))}
        </div>
      )}
      {(filterTagIds.length > 0 || filterCollectionIds.length > 0 || filterGroupIds.length > 0 || showNoTags || showNoCollections) && (
        <button onClick={() => { setFilterTagIds([]); setFilterCollectionIds([]); setFilterGroupIds([]); setShowNoTags(false); setShowNoCollections(false); }} className="text-xs text-red-400 hover:text-red-300">✕ Сбросить</button>
      )}
      </div>
      </div>

      {/* grid: виртуализированные ряды, превью грузятся лениво */}
      <main className="flex-1 p-3 sm:p-6" style={{ paddingTop: headerHeight + 12 }}>
        <div ref={gridRef} className="relative max-w-5xl mx-auto" style={{ height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              className="absolute left-0 grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4"
              style={{ top: row.start - scrollMargin, height: rowHeight - gap }}
            >
              {filtered.slice(row.index * columns, row.index * columns + columns).map((file) => {
                const mediaTags = tagMedia.filter((tm) => tm.fileId === file.id);
                return (
                  <button key={file.id} onClick={() => (mode === "select" ? toggleSelect(file.id) : setSelected(file.id))} className={`group rounded-xl border overflow-hidden transition text-left ${mode === "select" && selectedIds.has(file.id) ? "border-blue-500 ring-2 ring-blue-500/40" : "border-gray-800 bg-gray-900/60 hover:border-gray-700"}`}>
                    <div className="aspect-square bg-gray-800 relative overflow-hidden flex items-center justify-center">
                      {mode === "select" && (
                        <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] transition z-10 ${selectedIds.has(file.id) ? "bg-blue-500 border-blue-500" : "border-white/40 group-hover:border-white/70 bg-black/30"}`}>
                          {selectedIds.has(file.id) ? <span className="text-white font-bold">✓</span> : null}
                        </div>
                      )}
                      {file.type === "video" ? (
                        <>
                          <Image unoptimized loading="lazy" src={filesApi.thumbnailUrl(file.id)} alt="" fill className={`object-cover ${blurMedia ? "blur-xl" : ""}`} />
                          <span className="absolute inset-0 flex items-center justify-center text-3xl text-white/70">▶</span>
                        </>
                      ) : (
                        <Image unoptimized loading="lazy" src={filesApi.thumbnailUrl(file.id)} alt="" fill className={`object-cover ${blurMedia ? "blur-xl" : ""}`} />
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                      {mediaTags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {mediaTags.map((mt) => {
                            const tag = tagMap[mt.tagId];
                            return tag ? <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tag.color + "30", color: tag.color }}>{tag.name}</span> : null;
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-center text-sm text-gray-600 mt-12">Нет файлов</p>}
      </main>

      {/* панель массовых операций (режим выбора) */}
      {mode === "select" && selectedIds.size > 0 && (
        <div className="sticky bottom-0 z-30 border-t border-gray-800 bg-gray-900/95 backdrop-blur px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs sm:text-sm text-gray-300">Выбрано <strong>{selectedIds.size}</strong> из {filtered.length}</span>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            <button onClick={() => setAssignModal({ mode: "tags", action: "add" })} className="rounded-lg bg-blue-600 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium hover:bg-blue-500 transition whitespace-nowrap">🏷️ <span className="hidden sm:inline">Назначить теги</span></button>
            <button onClick={() => setAssignModal({ mode: "collections", action: "add" })} className="rounded-lg bg-purple-600 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium hover:bg-purple-500 transition whitespace-nowrap">📂 <span className="hidden sm:inline">Назначить коллекции</span></button>
            <button onClick={() => setAssignModal({ mode: "groups", action: "add" })} className="rounded-lg bg-emerald-600 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium hover:bg-emerald-500 transition whitespace-nowrap">🔸 <span className="hidden sm:inline">Назначить группы</span></button>
            <button onClick={() => setAssignModal({ mode: "groups", action: "remove" })} className="rounded-lg bg-red-600/80 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium hover:bg-red-500 transition whitespace-nowrap">🔸 <span className="hidden sm:inline">Удалить из групп</span></button>
            <button onClick={handleBulkDelete} className="rounded-lg bg-red-600/80 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium hover:bg-red-500 transition whitespace-nowrap">🗑 <span className="hidden sm:inline">Удалить</span></button>
            <button onClick={() => setSelectedIds(new Set())} className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-300 transition whitespace-nowrap">✕ <span className="hidden sm:inline">Очистить</span></button>
          </div>
        </div>
      )}

      {assignModal && (
        <AssignModal
          mode={assignModal.mode}
          action={assignModal.action}
          fileCount={selectedIds.size}
          tags={tags}
          collections={collections}
          collectionGroups={collectionGroups}
          initialCollectionId={filterCollectionIds.length === 1 ? filterCollectionIds[0] : null}
          applying={applying}
          onClose={() => setAssignModal(null)}
          onApply={applyAssign}
          onGroupCreated={(g) => setCollectionGroups((prev) => [...prev, g])}
        />
      )}

      {/* drawer */}
      {drawer && (
        <aside className="fixed inset-x-0 top-0 z-40 h-full w-full sm:inset-x-auto sm:right-0 sm:w-72 bg-gray-900 border-l border-gray-800 p-4 sm:p-5 flex flex-col gap-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{drawer === "tags" ? "Теги" : "Коллекции"}</h2>
            <button onClick={() => setDrawer(null)} className="text-gray-500 hover:text-white text-lg">&times;</button>
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addEntity(drawer); }}
            placeholder={drawer === "tags" ? "Поиск или создание тега..." : "Поиск или создание коллекции..."}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
          />
          <div className="flex-1 overflow-y-auto space-y-1">
            {(drawer === "tags" ? tags : collections)
              .filter((item) => !newName.trim() || item.name.toLowerCase().includes(newName.trim().toLowerCase()))
              .map((item) => {
                const tag = "color" in item ? item as Tag : null;
                const matched = newName.trim() && item.name.toLowerCase().includes(newName.trim().toLowerCase());
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between rounded-lg bg-gray-800/60 px-3 py-2 text-sm group">
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          defaultValue={item.name}
                          className="flex-1 min-w-0 bg-gray-900 border border-blue-500 rounded px-2 py-0.5 text-sm text-gray-200 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameEntity(drawer, item.id, e.currentTarget.value);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={(e) => renameEntity(drawer, item.id, e.currentTarget.value)}
                        />
                      ) : (
                        <span
                          className="truncate cursor-text hover:text-blue-400 transition"
                          onDoubleClick={() => { setEditingId(item.id); }}
                          title="Двойной клик для переименования"
                        >{tag ? <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color }} /> : null}{matched ? <span dangerouslySetInnerHTML={{ __html: item.name.replace(new RegExp(`(${newName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark class='bg-yellow-600/40 text-yellow-200 rounded px-0.5'>$1</mark>") }} /> : item.name}</span>
                      )}
                      <button onClick={() => delEntity(drawer, item.id)} className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 ml-2">&times;</button>
                    </div>
                    {drawer === "collections" && (
                      <>
                        <button
                          onClick={() => setExpandedGroups(expandedGroups === item.id ? null : item.id)}
                          className="ml-4 mt-1 text-[10px] text-gray-500 hover:text-gray-300 transition flex items-center gap-1"
                        >
                          {expandedGroups === item.id ? "▾" : "▸"} Группы ({collectionGroups.filter((g) => g.collectionId === item.id).length})
                        </button>
                        {expandedGroups === item.id && (
                          <div className="ml-4 mt-1 mb-2 space-y-1">
                            {collectionGroups.filter((g) => g.collectionId === item.id).map((g) => (
                              <div key={g.id} className="flex items-center justify-between rounded-lg bg-gray-800/30 px-3 py-1.5 text-xs group">
                                {editingId === g.id ? (
                                  <input
                                    autoFocus
                                    defaultValue={g.name}
                                    className="flex-1 min-w-0 bg-gray-900 border border-blue-500 rounded px-2 py-0.5 text-xs text-gray-200 outline-none"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") renameGroup(item.id, g.id, e.currentTarget.value);
                                      if (e.key === "Escape") setEditingId(null);
                                    }}
                                    onBlur={(e) => renameGroup(item.id, g.id, e.currentTarget.value)}
                                  />
                                ) : (
                                  <span
                                    className="truncate text-gray-400 cursor-text hover:text-blue-400 transition"
                                    onDoubleClick={() => { setEditingId(g.id); }}
                                    title="Двойной клик для переименования"
                                  >🔸 {g.name}</span>
                                )}
                                <button
                                  onClick={async () => {
                                    await groupsApi.delete(item.id, g.id);
                                    const fresh = await groupsApi.list(item.id);
                                    setCollectionGroups((prev) => [...prev.filter((x) => x.id !== g.id), ...fresh]);
                                  }}
                                  className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-1">
                              <input
                                placeholder="Новая группа..."
                                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    const input = e.currentTarget;
                                    const name = input.value.trim();
                                    if (!name) return;
                                    const g = await groupsApi.create(item.id, name);
                                    setCollectionGroups((prev) => [...prev, g]);
                                    input.value = "";
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            {newName.trim() && !(drawer === "tags" ? tags : collections).some((item) => item.name.toLowerCase() === newName.trim().toLowerCase()) && (
              <button onClick={() => addEntity(drawer)} className="w-full rounded-lg bg-blue-600/80 px-3 py-2 text-sm font-medium hover:bg-blue-500 transition text-center mt-2">
                + Создать «{newName.trim()}»
              </button>
            )}
            {newName.trim() && (drawer === "tags" ? tags : collections).some((item) => item.name.toLowerCase() === newName.trim().toLowerCase()) && (
              <p className="text-xs text-gray-500 text-center pt-2">Уже существует</p>
            )}
          </div>
        </aside>
      )}

      {/* modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-0" onClick={() => setSelected(null)}>
          <div className="relative w-full sm:max-w-[95vw] max-h-[90vh] flex flex-col sm:flex-row gap-3 sm:gap-6 overflow-y-auto sm:overflow-visible" onClick={(e) => e.stopPropagation()}>
            {/* top: media + actions */}
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
              <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                {selectedFile.type === "video" ? (
                  <video src={filesApi.downloadUrl(selectedFile.id)} controls className="max-h-[50vh] sm:max-h-[75vh] max-w-full rounded-lg" />
                ) : selectedFile.type === "gif" ? (
                  <GifScrubber key={selectedFile.id} src={filesApi.downloadUrl(selectedFile.id)} />
                ) : (
                  <Image unoptimized src={filesApi.downloadUrl(selectedFile.id)} alt="" width={1200} height={1200} className="max-h-[50vh] sm:max-h-[75vh] max-w-full w-auto h-auto rounded-lg" />
                )}
              </div>
              <div className="flex gap-2 justify-center mt-2 sm:mt-3 shrink-0">
                <a
                  href={filesApi.downloadUrl(selectedFile.id)}
                  download={selectedFile.filename}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition"
                >
                  ⬇ Скачать
                </a>
                <button
                  onClick={() => setShowModalSidebar((v) => !v)}
                  className="sm:hidden px-3 py-1.5 rounded-lg bg-gray-700 text-white text-xs font-medium hover:bg-gray-600 transition"
                >
                  {showModalSidebar ? "✕" : "ℹ️"}
                </button>
                <button
                  onClick={() => handleDelete(selectedFile.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-xs font-medium hover:bg-red-500 transition"
                >
                  🗑 Удалить
                </button>
              </div>
            </div>
            {/* bottom on mobile (toggleable), right on desktop: sidebar */}
            <div className={`${showModalSidebar ? "block" : "hidden"} sm:block w-full sm:w-64 shrink-0 overflow-y-auto border-t sm:border-t-0 sm:border-l border-gray-800 pt-3 sm:pt-0 sm:pl-6 space-y-4 sm:space-y-5`}>
              <div className="flex items-start justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Свойства</span>
                <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
              </div>
              {tags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 shrink-0 text-sm">🏷️</span>
                    <span className="text-xs text-gray-400 font-medium">Теги</span>
                  </div>
                  {/* active tags as chips */}
                  {(() => {
                    const activeTags = tags.filter((t) => tagMedia.some((tm) => tm.fileId === selectedFile.id && tm.tagId === t.id));
                    return activeTags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {activeTags.map((t) => (
                          <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + "30", color: t.color }}>{t.name}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600">Нет тегов</p>
                    );
                  })()}
                  <input value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder="Добавить тег..." className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500" />
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {(tagQuery ? tags.filter((t) => t.name.toLowerCase().includes(tagQuery.toLowerCase())) : tags).map((tag) => {
                      const active = tagMedia.some((tm) => tm.fileId === selectedFile.id && tm.tagId === tag.id);
                      return (
                        <button key={tag.id} onClick={() => toggleLink("tags-media", selectedFile.id, tag.id)} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center gap-2 ${active ? "bg-blue-600/20 text-blue-300" : "text-gray-400 hover:bg-gray-800"}`}>
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="truncate flex-1">{tag.name}</span>
                          {active && <span className="text-blue-400 shrink-0">✓</span>}
                        </button>
                      );
                    })}
                    {tagQuery && tags.filter((t) => t.name.toLowerCase().includes(tagQuery.toLowerCase())).length === 0 && <p className="text-xs text-gray-600 text-center py-2">Нет совпадений</p>}
                  </div>
                </div>
              )}
              {collections.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 shrink-0 text-sm">📂</span>
                    <span className="text-xs text-gray-400 font-medium">Коллекции</span>
                  </div>
                  {(() => {
                    const activeCols = collections.filter((c) => collectionMedia.some((cm) => cm.fileId === selectedFile.id && cm.collectionId === c.id));
                    return activeCols.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {activeCols.map((c) => (
                          <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">{c.name}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600">Нет коллекций</p>
                    );
                  })()}
                  <input value={collectionQuery} onChange={(e) => setCollectionQuery(e.target.value)} placeholder="Добавить коллекцию..." className="w-full rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500" />
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {(collectionQuery ? collections.filter((c) => c.name.toLowerCase().includes(collectionQuery.toLowerCase())) : collections).map((col) => {
                      const active = collectionMedia.some((cm) => cm.fileId === selectedFile.id && cm.collectionId === col.id);
                      const colGroups = collectionGroups.filter((g) => g.collectionId === col.id);
                      return (
                        <div key={col.id}>
                          <button onClick={() => toggleLink("collections-media", selectedFile.id, col.id)} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center gap-2 ${active ? "bg-blue-600/20 text-blue-300" : "text-gray-400 hover:bg-gray-800"}`}>
                            <span className="truncate flex-1">{col.name}</span>
                            {active && <span className="text-blue-400 shrink-0">✓</span>}
                          </button>
                          {active && colGroups.length > 0 && (
                            <div className="ml-3 mt-1 space-y-0.5">
                              {colGroups.map((g) => {
                                const gActive = fileGroups.some((fg) => fg.fileId === selectedFile.id && fg.groupId === g.id);
                                return (
                                  <button
                                    key={g.id}
                                    onClick={async () => {
                                      if (gActive) {
                                        await groupMediaApi.unlink(selectedFile.id, g.id);
                                      } else {
                                        await groupMediaApi.link(selectedFile.id, g.id);
                                      }
                                      const meta = await loadAllMetadata();
                                      setFileGroups(meta.groupMedia);
                                    }}
                                    className={`w-full text-left px-2 py-1 rounded text-[10px] transition flex items-center gap-1 ${gActive ? "bg-green-600/20 text-green-300" : "text-gray-500 hover:text-gray-300"}`}
                                  >
                                    <span>🔸</span>
                                    <span className="truncate flex-1">{g.name}</span>
                                    {gActive && <span className="text-green-400 shrink-0">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {collectionQuery && collections.filter((c) => c.name.toLowerCase().includes(collectionQuery.toLowerCase())).length === 0 && <p className="text-xs text-gray-600 text-center py-2">Нет совпадений</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Media;
