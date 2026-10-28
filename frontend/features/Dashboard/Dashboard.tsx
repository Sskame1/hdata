"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { filesApi, appsApi, mangaApi } from "@/lib/api";

const SETTINGS_KEY = "hdata:blurMedia";

function getBlurSetting(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SETTINGS_KEY) === "true";
}

const Dashboard = () => {
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [appCount, setAppCount] = useState<number | null>(null);
  const [mangaCount, setMangaCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<{ id: string; filename: string; type: string }[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blurMedia, setBlurMedia] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<{ usedBytes: number; totalBytes: number; availableBytes: number } | null>(null);
  const [cacheStats, setCacheStats] = useState<{ sizeBytes: number; fileCount: number } | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  const fetchCacheStats = async () => {
    try {
      const s = await filesApi.cacheStats();
      setCacheStats(s);
    } catch {}
  };

  useEffect(() => { if (settingsOpen) fetchCacheStats(); }, [settingsOpen]); // eslint-disable-line react-hooks/set-state-in-effect

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await filesApi.clearCache();
      setCacheStats({ sizeBytes: 0, fileCount: 0 });
    } catch {}
    setClearingCache(false);
  };

  function formatBytes(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  useEffect(() => {
    setBlurMedia(getBlurSetting()); // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([filesApi.list(), appsApi.list(), filesApi.storageStats(), mangaApi.list()]).then(([files, apps, stats, manga]) => {
      setFileCount(files.length);
      setAppCount(apps.length);
      setMangaCount(manga.length);
      setRecent(files.slice(0, 5).map((f) => ({ id: f.id, filename: f.filename, type: f.type })));
      setStorageStats(stats);
    }).catch(() => {});
  }, []);

  const toggleBlur = () => {
    const next = !blurMedia;
    setBlurMedia(next);
    localStorage.setItem(SETTINGS_KEY, next ? "true" : "false");
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenerateResult(null);
    try {
      const res = await filesApi.regenerateThumbnails();
      const ok = res.filter((r) => r.status === "ok").length;
      const regen = res.filter((r) => r.status === "regenerated").length;
      const err = res.filter((r) => r.status === "error").length;
      setRegenerateResult(`✅ ${ok} пропущено, 🔄 ${regen} создано${err ? `, ❌ ${err} ошибок` : ""}`);
    } catch (err) {
      setRegenerateResult(`❌ Ошибка: ${err instanceof Error ? err.message : "неизвестная"}`);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await filesApi.syncFromStorage();
      const created = res.filter((r) => r.status === "created").length;
      const exists = res.filter((r) => r.status === "exists").length;
      const err = res.filter((r) => r.status === "error").length;
      setSyncResult(`📥 ${created} добавлено, ⏭ ${exists} пропущено${err ? `, ❌ ${err} ошибок` : ""}`);
      window.location.reload();
    } catch (err) {
      setSyncResult(`❌ Ошибка: ${err instanceof Error ? err.message : "неизвестная"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-950 text-gray-100 flex flex-col">
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-800 flex-wrap">
        <span className="text-lg sm:text-xl shrink-0">📁</span>
        <h1 className="text-base sm:text-lg font-semibold tracking-tight shrink-0">LocalVault</h1>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-lg">
          <button onClick={() => setSettingsOpen(true)} className="hover:text-gray-300 transition cursor-pointer">⚙️</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8 px-3 sm:px-6 py-8 sm:py-12 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full">
          <Link href="/media" className="group rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-6 hover:border-blue-600/50 hover:bg-gray-900 transition">
            <div className="text-4xl mb-3">🖼️</div>
            <h2 className="text-xl font-bold">МЕДИАТЕКА</h2>
            <p className="mt-1 text-sm text-gray-400">{fileCount !== null ? `${fileCount} файлов` : "—"}</p>
            <span className="mt-4 inline-block text-sm text-blue-400 group-hover:underline">Перейти →</span>
          </Link>
          <Link href="/shop" className="group rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-6 hover:border-purple-600/50 hover:bg-gray-900 transition">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📦</div>
            <h2 className="text-lg sm:text-xl font-bold">МАГАЗИН</h2>
            <p className="mt-1 text-sm text-gray-400">{appCount !== null ? `${appCount} приложений` : "—"}</p>
            <span className="mt-4 inline-block text-sm text-purple-400 group-hover:underline">Перейти →</span>
          </Link>
          <Link href="/manga" className="group rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-6 hover:border-pink-600/50 hover:bg-gray-900 transition">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📖</div>
            <h2 className="text-lg sm:text-xl font-bold">МАНГА</h2>
            <p className="mt-1 text-sm text-gray-400">{mangaCount !== null ? `${mangaCount} тайтлов` : "—"}</p>
            <span className="mt-4 inline-block text-sm text-pink-400 group-hover:underline">Перейти →</span>
          </Link>
          <Link href="/stat" className="group rounded-2xl border border-gray-800 bg-gray-900/60 p-4 sm:p-6 hover:border-cyan-600/50 hover:bg-gray-900 transition">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📊</div>
            <h2 className="text-lg sm:text-xl font-bold">СТАТИСТИКА</h2>
            <p className="mt-1 text-sm text-gray-400">Графики и метрики</p>
            <span className="mt-4 inline-block text-sm text-cyan-400 group-hover:underline">Перейти →</span>
          </Link>
        </div>

        <section className="w-full">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Недавние добавления</h3>
          <div className="flex gap-3 flex-wrap">
            {recent.length > 0 ? recent.map((r) => (
              <div key={r.id} className="w-24 h-24 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden relative">
                {["img", "gif", "video"].includes(r.type) ? (
                  <Image unoptimized src={filesApi.thumbnailUrl(r.id)} alt="" fill className={`object-cover ${blurMedia ? "blur-xl" : ""}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 capitalize">
                    {r.filename.length > 10 ? r.filename.slice(0, 10) + "…" : r.filename}
                  </div>
                )}
              </div>
            )) : (
              <div className="text-xs text-gray-600">Нет файлов</div>
            )}
          </div>
        </section>

        <section className="w-full">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">ХРАНИЛИЩЕ</span>
            <span className="text-gray-500">
              {storageStats
                ? `${(storageStats.usedBytes / 1024 / 1024 / 1024).toFixed(1)} GB / ${(storageStats.availableBytes / 1024 / 1024 / 1024).toFixed(1)} GB`
                : "—"}
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
            {storageStats && storageStats.totalBytes > 0 && (
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                style={{ width: `${Math.min(100, (storageStats.usedBytes / storageStats.totalBytes) * 100)}%` }}
              />
            )}
          </div>
          {storageStats && (
            <p className="text-[11px] text-gray-600 mt-1">
              Всего: {(storageStats.totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB
            </p>
          )}
        </section>
      </main>
      {/* settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setSettingsOpen(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">⚙️ Настройки</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-white text-xl cursor-pointer">&times;</button>
            </div>
            <label className="flex items-center justify-between rounded-xl bg-gray-800/60 px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium">Размытие медиафайлов</p>
                <p className="text-xs text-gray-500 mt-0.5">Превью в Медиатеке будет размыто</p>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); toggleBlur(); }}
                className={`relative w-11 h-6 rounded-full transition cursor-pointer ${blurMedia ? "bg-blue-600" : "bg-gray-700"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${blurMedia ? "translate-x-5" : ""}`} />
              </div>
            </label>

            <div className="mt-6 pt-4 border-t border-gray-800">
              <p className="text-sm font-medium mb-2">Превью видео/GIF</p>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="w-full rounded-xl bg-gray-800/60 px-4 py-3 text-sm font-medium hover:bg-gray-700/60 transition disabled:opacity-50 cursor-pointer"
              >
                {regenerating ? "🔄 Проверка..." : "🔍 Проверить и восстановить превью"}
              </button>
              {regenerateResult && (
                <p className="mt-2 text-xs text-gray-400">{regenerateResult}</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-sm font-medium mb-2">Кеш файлов</p>
              <div className="flex items-center justify-between rounded-xl bg-gray-800/60 px-4 py-3 mb-2">
                <span className="text-xs text-gray-400">{cacheStats ? `${cacheStats.fileCount} файлов, ${formatBytes(cacheStats.sizeBytes)}` : "—"}</span>
              </div>
              <button
                onClick={handleClearCache}
                disabled={clearingCache || !cacheStats || cacheStats.fileCount === 0}
                className="w-full rounded-xl bg-gray-800/60 px-4 py-3 text-sm font-medium hover:bg-gray-700/60 transition disabled:opacity-50 cursor-pointer"
              >
                {clearingCache ? "🔄 Очистка..." : "🗑 Очистить кеш"}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-sm font-medium mb-2">Импорт файлов из хранилища</p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full rounded-xl bg-gray-800/60 px-4 py-3 text-sm font-medium hover:bg-gray-700/60 transition disabled:opacity-50 cursor-pointer"
              >
                {syncing ? "🔄 Синхронизация..." : "📥 Сканировать и добавить новые файлы"}
              </button>
              {syncResult && (
                <p className="mt-2 text-xs text-gray-400">{syncResult}</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard;
