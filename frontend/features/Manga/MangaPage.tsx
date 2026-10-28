"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mangaApi, mangaTagsApi, mangaTagMediaApi } from "@/lib/api";
import type { MangaItem, MangaTag } from "@/lib/types";
import AddMangaModal from "./AddMangaModal";

export default function MangaPage() {
  const [mangaList, setMangaList] = useState<MangaItem[]>([]);
  const [allTags, setAllTags] = useState<MangaTag[]>([]);
  const [selected, setSelected] = useState<MangaItem | null>(null);
  const [reading, setReading] = useState<{ mangaId: string; chapterId: string; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addingChapter, setAddingChapter] = useState(false);
  const [chapterNum, setChapterNum] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterPageCount, setChapterPageCount] = useState("");
  const [chapterFile, setChapterFile] = useState<File | null>(null);
  const [chapterUploading, setChapterUploading] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [tagSearch, setTagSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");

  const load = () => {
    setLoading(true);
    Promise.all([mangaApi.list(), mangaTagsApi.list()])
      .then(([manga, tags]) => { setMangaList(manga); setAllTags(tags); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const handleSelect = async (id: string) => {
    if (selected?.id === id) { setSelected(null); return; }
    try {
      const manga = await mangaApi.get(id);
      setSelected(manga);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот тайтл? Главы и обложка будут удалены безвозвратно.")) return;
    try {
      await mangaApi.delete(id);
      if (selected?.id === id) setSelected(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleAddChapter = async () => {
    if (!selected || !chapterFile) return;
    const num = parseInt(chapterNum);
    if (isNaN(num) || num < 1) { setError("Номер главы должен быть >= 1"); return; }

    setChapterUploading(true);
    setError(null);
    try {
      const pc = chapterPageCount ? parseInt(chapterPageCount) : undefined;
      await mangaApi.addChapter(selected.id, num, chapterTitle || undefined, chapterFile, pc);
      const updated = await mangaApi.get(selected.id);
      setSelected(updated);
      setAddingChapter(false);
      setChapterNum("");
      setChapterTitle("");
      setChapterPageCount("");
      setChapterFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add chapter");
    } finally {
      setChapterUploading(false);
    }
  };

  const toggleFilterTag = (tagId: string) => {
    setFilterTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await mangaTagsApi.create(newTagName.trim(), newTagColor);
      setNewTagName("");
      const tags = await mangaTagsApi.list();
      setAllTags(tags);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create tag");
    }
  };

  const handleAssignTag = async (tagId: string) => {
    if (!selected) return;
    try {
      await mangaTagMediaApi.link(selected.id, tagId);
      const updated = await mangaApi.get(selected.id);
      setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign tag");
    }
  };

  const handleUnassignTag = async (tagId: string) => {
    if (!selected) return;
    try {
      await mangaTagMediaApi.unlink(selected.id, tagId);
      const updated = await mangaApi.get(selected.id);
      setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unassign tag");
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Удалить тег? Связи будут разорваны.")) return;
    try {
      await mangaTagsApi.delete(tagId);
      setAllTags((prev) => prev.filter((t) => t.id !== tagId));
      if (selected) {
        const updated = await mangaApi.get(selected.id);
        setSelected(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete tag");
    }
  };

  const filteredManga = filterTagIds.size === 0
    ? mangaList
    : mangaList.filter((m) => {
        const mTagIds = new Set(m.mangaTags.map((mt) => mt.tagId));
        return [...filterTagIds].every((id) => mTagIds.has(id));
      });

  const filteredTags = tagSearch
    ? allTags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : allTags;

  if (reading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
        <header className="flex items-center gap-3 px-6 py-3 border-b border-gray-800">
          <button onClick={() => setReading(null)} className="text-sm text-blue-400 hover:underline cursor-pointer">
            ← Назад
          </button>
          <h1 className="text-lg font-semibold">{reading.title}</h1>
        </header>
        <iframe
          src={mangaApi.pdfUrl(reading.mangaId, reading.chapterId)}
          className="flex-1 w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-950 text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition whitespace-nowrap">&larr; На главную</Link>
          <h1 className="text-lg font-semibold">Манга</h1>
          <span className="text-sm text-gray-500">{filteredManga.length} тайтлов</span>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition cursor-pointer"
        >
          + Добавить
        </button>
      </header>

      {allTags.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-800/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Теги:</span>
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleFilterTag(tag.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer border ${
                  filterTagIds.has(tag.id)
                    ? "border-transparent text-white"
                    : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                }`}
                style={filterTagIds.has(tag.id) ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            ))}
            {filterTagIds.size > 0 && (
              <button
                onClick={() => setFilterTagIds(new Set())}
                className="text-xs text-gray-500 hover:text-gray-300 ml-1 cursor-pointer"
              >
                сбросить
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-400">Загрузка…</div>
      ) : filteredManga.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          {mangaList.length === 0 ? "Нет манги. Нажмите «+ Добавить»" : "Нет манги с выбранными тегами"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
          {filteredManga.map((manga) => (
            <div
              key={manga.id}
              onClick={() => handleSelect(manga.id)}
              className="group cursor-pointer rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 overflow-hidden transition"
            >
              <div className="aspect-[3/4] bg-gray-800 relative overflow-hidden">
                {manga.coverImg ? (
                  <img
                    src={mangaApi.coverUrl(manga.id)}
                    alt={manga.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📖</div>
                )}
              </div>
              <div className="p-2">
                <h3 className="text-sm font-medium truncate">{manga.title}</h3>
                {manga.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{manga.description}</p>
                )}
                {manga.mangaTags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {manga.mangaTags.slice(0, 3).map((mt) => (
                      <span
                        key={mt.tagId}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                        style={{ backgroundColor: mt.tag.color }}
                      >
                        {mt.tag.name}
                      </span>
                    ))}
                    {manga.mangaTags.length > 3 && (
                      <span className="text-[10px] text-gray-500">+{manga.mangaTags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-28 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-gray-800">
                  {selected.coverImg ? (
                    <img src={mangaApi.coverUrl(selected.id)} alt={selected.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📖</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold">{selected.title}</h2>
                      {selected.description && <p className="text-sm text-gray-400 mt-1">{selected.description}</p>}
                      <p className="text-xs text-gray-600 mt-2">{selected.chapters?.length || 0} глав</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(selected.id)}
                        className="rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1.5 text-xs font-medium transition cursor-pointer"
                      >
                        Удалить
                      </button>
                      <button
                        onClick={() => setSelected(null)}
                        className="rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 text-xs font-medium transition cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Теги</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selected.mangaTags.map((mt) => (
                    <span
                      key={mt.tagId}
                      className="group/tag inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: mt.tag.color }}
                    >
                      {mt.tag.name}
                      <button
                        onClick={() => handleUnassignTag(mt.tagId)}
                        className="opacity-0 group-hover/tag:opacity-100 text-white/70 hover:text-white cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {selected.mangaTags.length === 0 && (
                    <span className="text-xs text-gray-600">Нет тегов</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Поиск тега..."
                    className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    placeholder="Новый тег..."
                    className="w-32 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {filteredTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {filteredTags
                      .filter((t) => !selected.mangaTags.some((mt) => mt.tagId === t.id))
                      .map((tag) => (
                        <span key={tag.id} className="group/avail inline-flex items-center">
                          <button
                            onClick={() => handleAssignTag(tag.id)}
                            className="px-2 py-0.5 rounded-l-full text-xs font-medium border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition cursor-pointer"
                            style={{ borderColor: tag.color + "40" }}
                          >
                            + {tag.name}
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="px-1 py-0.5 rounded-r-full text-xs text-gray-600 hover:text-red-400 border border-l-0 border-gray-700 hover:border-red-500/50 transition cursor-pointer opacity-0 group-hover/avail:opacity-100"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Главы</h3>
                <button
                  onClick={() => setAddingChapter(!addingChapter)}
                  className="text-xs text-blue-400 hover:underline cursor-pointer"
                >
                  {addingChapter ? "Отмена" : "+ Добавить главу"}
                </button>
              </div>

              {addingChapter && (
                <div className="mb-4 p-4 rounded-xl bg-gray-800/80 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-24">
                      <label className="text-xs text-gray-500 block mb-1">Номер *</label>
                      <input
                        type="number"
                        min={1}
                        value={chapterNum}
                        onChange={(e) => setChapterNum(e.target.value)}
                        className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Заголовок</label>
                      <input
                        value={chapterTitle}
                        onChange={(e) => setChapterTitle(e.target.value)}
                        placeholder="Глава N: заголовок"
                        className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500 block mb-1">Страниц</label>
                      <input
                        type="number"
                        min={1}
                        value={chapterPageCount}
                        onChange={(e) => setChapterPageCount(e.target.value)}
                        placeholder="авто"
                        className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">PDF файл *</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setChapterFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={handleAddChapter}
                    disabled={chapterUploading || !chapterFile}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer"
                  >
                    {chapterUploading ? "Загрузка..." : "Добавить главу"}
                  </button>
                </div>
              )}
              <div className="space-y-1">
                {(!selected.chapters || selected.chapters.length === 0) ? (
                  <p className="text-sm text-gray-600">Нет глав</p>
                ) : (
                  selected.chapters.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setReading({ mangaId: selected.id, chapterId: ch.id, title: `${selected.title} — Глава ${ch.chapterNumber}${ch.title ? `: ${ch.title}` : ""}` })}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/60 hover:bg-gray-700/60 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Глава {ch.chapterNumber}</span>
                        {ch.title && <span className="text-sm text-gray-400">{ch.title}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {ch.pageCount !== null && <span>{ch.pageCount} стр.</span>}
                        <span className="text-blue-400 hover:underline">Читать →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <AddMangaModal
          onClose={() => setAddOpen(false)}
          onCreated={load}
        />
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-900/90 text-red-200 px-4 py-2 rounded-xl text-sm shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-white cursor-pointer">&times;</button>
        </div>
      )}
    </div>
  );
}
