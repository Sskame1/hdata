"use client";

/* Магазин приложений (/shop). Grid, поиск, upload-модал, детальный модал со скриншотами/видео/скачиванием. */
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { appsApi } from "@/lib/api";
import type { AppItem } from "@/lib/types";

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const ShopApp = () => {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  /* Форма создания приложения */
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formVersion, setFormVersion] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const screenshotsRef = useRef<HTMLInputElement>(null);
  const videosRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  /* Загрузка списка приложений */
  const load = useCallback(async () => {
    try {
      setApps(await appsApi.list());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  /* Фильтрация по поиску */
  const filtered = search
    ? apps.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : apps;

  const handleUpload = async () => {
    if (!formName.trim()) return;
    const fd = new FormData();
    fd.append("name", formName.trim());
    fd.append("description", formDesc.trim());
    fd.append("version", formVersion.trim());

    if (coverRef.current?.files?.[0]) fd.append("cover", coverRef.current.files[0]);
    if (screenshotsRef.current?.files) {
      for (const f of Array.from(screenshotsRef.current.files)) fd.append("screenshots", f);
    }
    if (videosRef.current?.files) {
      for (const f of Array.from(videosRef.current.files)) fd.append("videos", f);
    }
    if (filesRef.current?.files) {
      for (const f of Array.from(filesRef.current.files)) fd.append("files", f);
    }

    setUploading(true);
    setUploadError(null);
    try {
      await appsApi.create(fd);
      setShowUpload(false);
      setFormName("");
      setFormDesc("");
      setFormVersion("");
      if (coverRef.current) coverRef.current.value = "";
      if (screenshotsRef.current) screenshotsRef.current.value = "";
      if (videosRef.current) videosRef.current.value = "";
      if (filesRef.current) filesRef.current.value = "";
      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await appsApi.delete(id);
      setSelectedApp(null);
      setDeleteConfirm(null);
      await load();
    } catch { /* ignore */ }
  };

  /* Сброс индекса превью при выборе нового приложения */
  useEffect(() => { setPreviewIdx(0); }, [selectedApp]); // eslint-disable-line react-hooks/set-state-in-effect

  /* Escape key */
  useEffect(() => {
    if (!selectedApp && !showUpload) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectedApp(null); setShowUpload(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedApp, showUpload]);

  return (
    <div className="min-h-full bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-800 flex-wrap">
        <Link href="/" className="text-xs sm:text-sm text-gray-400 hover:text-gray-200 transition whitespace-nowrap">&larr; Магазин</Link>
        <input
          type="text"
          placeholder="Поиск проектов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[100px] sm:min-w-[160px] max-w-xs rounded-lg bg-gray-900 border border-gray-700 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
        />
        <button
          onClick={() => setShowUpload(true)}
          className="rounded-lg bg-blue-600 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium hover:bg-blue-500 transition whitespace-nowrap"
        >
          + Проект
        </button>
      </header>

      {/* Grid */}
      <main className="flex-1 p-3 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {filtered.map((app) => (
            <button key={app.id} onClick={() => setSelectedApp(app)} className="group rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden hover:border-gray-700 transition text-left">
              {/* Cover */}
              <div className="aspect-[16/9] bg-gray-800 relative overflow-hidden flex items-center justify-center">
                {app.coverImg ? (
                  <Image unoptimized src={appsApi.coverUrl(app.id)} alt="" fill className="object-cover" />
                ) : (
                  <span className="text-4xl text-gray-600">📦</span>
                )}
              </div>
              <div className="p-3 sm:p-4 space-y-1">
                <h3 className="font-semibold truncate text-sm sm:text-base">{app.name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {app.version && <span>v{app.version}</span>}
                  <span>{formatSize(app.size)}</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm col-span-full text-center py-12">
              {apps.length === 0 ? "Нет проектов. Нажмите «+ Проект» чтобы создать." : "Ничего не найдено"}
            </p>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2" onClick={() => !uploading && setShowUpload(false)}>
          <div className="bg-gray-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Новый проект</h2>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Название *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Описание</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 resize-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Версия</label>
              <input value={formVersion} onChange={(e) => setFormVersion(e.target.value)} placeholder="1.0" className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Обложка</label>
              <input ref={coverRef} type="file" accept="image/*" className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Скриншоты</label>
              <input ref={screenshotsRef} type="file" accept="image/*" multiple className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Видео</label>
              <input ref={videosRef} type="file" accept="video/*" multiple className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Файлы для скачивания</label>
              <input ref={filesRef} type="file" multiple className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700" />
            </div>

            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowUpload(false)} disabled={uploading} className="px-4 py-2 rounded-lg bg-gray-800 text-sm text-gray-300 hover:bg-gray-700 transition disabled:opacity-50">Отмена</button>
              <button onClick={handleUpload} disabled={uploading || !formName.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium hover:bg-blue-500 transition disabled:opacity-50">
                {uploading ? "Загрузка..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => { setSelectedApp(null); setDeleteConfirm(null); }}>
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-gray-900 rounded-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button onClick={() => { setSelectedApp(null); setDeleteConfirm(null); }} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white text-lg">&times;</button>

            {/* Preview area */}
            <div className="aspect-video bg-gray-800 relative flex items-center justify-center overflow-hidden">
              {selectedApp.screenshots.length > 0 ? (
                <>
                  <Image unoptimized src={appsApi.mediaUrl(selectedApp.id, "screenshots", selectedApp.screenshots[previewIdx]?.id)} alt="" fill className="object-contain" />
                  {selectedApp.screenshots.length > 1 && (
                    <>
                      <button onClick={() => setPreviewIdx((p) => (p - 1 + selectedApp.screenshots.length) % selectedApp.screenshots.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition text-lg">&lsaquo;</button>
                      <button onClick={() => setPreviewIdx((p) => (p + 1) % selectedApp.screenshots.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition text-lg">&rsaquo;</button>
                    </>
                  )}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {selectedApp.screenshots.map((_, i) => (
                      <button key={i} onClick={() => setPreviewIdx(i)} className={`w-2 h-2 rounded-full transition ${i === previewIdx ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                </>
              ) : selectedApp.coverImg ? (
                <Image unoptimized src={appsApi.coverUrl(selectedApp.id)} alt="" fill className="object-contain" />
              ) : (
                <span className="text-5xl text-gray-600">📦</span>
              )}
            </div>

            {/* Info */}
            <div className="p-4 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{selectedApp.name}</h2>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 mt-1">
                    {selectedApp.version && <span>Версия {selectedApp.version}</span>}
                    <span>{formatSize(selectedApp.size)}</span>
                  </div>
                </div>
              </div>

              {selectedApp.description && (
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedApp.description}</p>
              )}

              {/* Screenshots row */}
              {selectedApp.screenshots.length > 0 && (
                <div>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Скриншоты</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedApp.screenshots.map((ss, i) => (
                      <button key={ss.id} onClick={() => setPreviewIdx(i)} className={`shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition ${i === previewIdx ? "border-blue-500" : "border-transparent hover:border-gray-600"}`}>
                        <Image unoptimized src={appsApi.mediaUrl(selectedApp.id, "screenshots", ss.id)} alt="" width={96} height={64} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos row */}
              {selectedApp.videos.length > 0 && (
                <div>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Видео</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedApp.videos.map((v) => (
                      <video key={v.id} src={appsApi.mediaUrl(selectedApp.id, "videos", v.id)} controls className="shrink-0 w-48 h-28 rounded-lg bg-gray-800 object-cover" />
                    ))}
                  </div>
                </div>
              )}

              {/* Download files */}
              {selectedApp.downloads.length > 0 && (
                <div>
                  <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Скачать</h3>
                  <div className="space-y-2">
                    {selectedApp.downloads.map((dl) => (
                      <div key={dl.id} className="flex items-center justify-between rounded-lg bg-gray-800/60 px-3 sm:px-4 py-2.5 sm:py-3 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{dl.name}</p>
                          <p className="text-xs text-gray-500">{formatSize(dl.size)}{dl.version ? ` · v${dl.version}` : ""}</p>
                        </div>
                        <a
                          href={appsApi.downloadUrl(selectedApp.id, dl.id)}
                          className="shrink-0 rounded-lg bg-blue-600 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium hover:bg-blue-500 transition text-center"
                        >
                          ⬇ Скачать
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="border-t border-gray-800 pt-4">
                {deleteConfirm === selectedApp.id ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-400">Удалить проект?</span>
                    <button onClick={() => handleDelete(selectedApp.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition">Да</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition">Нет</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(selectedApp.id)} className="text-xs text-red-400 hover:text-red-300 transition">🗑 Удалить проект</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopApp;
