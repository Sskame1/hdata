"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { statApi } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " GB";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " MB";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " KB";
  return n + " B";
}

function shorten(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function StatPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statApi.get().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-center text-red-400">Ошибка: {error}</div>;
  if (!stats) return <div className="p-8 text-center text-gray-400">Загрузка…</div>;

  const { counts, distribution, storage } = stats;
  const mangaCount = counts.manga ?? 0;

  const fileTypeData = [
    { name: "Изображения", count: counts.images, fill: "#3b82f6" },
    { name: "GIF", count: counts.gifs, fill: "#8b5cf6" },
    { name: "Видео", count: counts.videos, fill: "#ef4444" },
  ];
  const pieData = fileTypeData.filter((d) => d.count > 0);
  const topTags = distribution.filesPerTag.slice(0, 15);
  const topCollections = distribution.filesPerCollection.slice(0, 10);
  const topGroups = distribution.filesPerGroup.slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* хедер */}
      <header className="flex items-center gap-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition whitespace-nowrap">&larr; На главную</Link>
        <h1 className="text-2xl font-bold text-white">Статистика</h1>
      </header>

      {/* KPI-карточки */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <KpiCard icon="📁" label="Файлов" value={counts.files} sub={fileTypeData.filter((d) => d.count > 0).map((d) => `${d.name}: ${d.count}`).join(" · ")} />
        <KpiCard icon="📖" label="Манга" value={mangaCount} />
        <KpiCard icon="📂" label="Коллекций" value={counts.collections} />
        <KpiCard icon="🏷️" label="Тегов" value={counts.tags} />
        <KpiCard icon="🔸" label="Групп" value={counts.collectionGroups} />
        <KpiCard icon="📦" label="Приложений" value={counts.apps} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* По типу — пончик */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">По типу</h2>
          {pieData.length === 0 ? <p className="text-gray-500 text-sm">Нет данных</p> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="count" labelLine={false}>
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs mt-2 flex-wrap">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                    <span className="text-gray-400">{entry.name}: {entry.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Хранилище */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Хранилище</h2>
          {storage ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Занято на диске</span>
                <span className="font-mono">{fmt(storage.usedBytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Доступно</span>
                <span className="font-mono">{fmt(storage.availableBytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Всего</span>
                <span className="font-mono">{fmt(storage.totalBytes)}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 mt-2">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${storage.totalBytes > 0 ? (storage.usedBytes / storage.totalBytes) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{storage.totalBytes > 0 ? ((storage.usedBytes / storage.totalBytes) * 100).toFixed(1) : 0}% занято</span>
                <span>{fmt(counts.dbSizeBytes)} в БД</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Нет данных (только внутри Docker)</p>
          )}
        </div>

        {/* Топ тегов */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Файлов по тегам (топ-15)</h2>
          {topTags.length === 0 ? <p className="text-gray-500 text-sm">Нет данных</p> : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {topTags.map((t) => (
                <div key={t.tagId} className="grid grid-cols-[1fr_40px_80px] items-center gap-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.tagColor }} />
                    <span className="text-gray-400 truncate">{shorten(t.tagName, 20)}</span>
                  </span>
                  <span className="font-mono text-xs text-gray-500 text-right">{t.count}</span>
                  <div className="bg-gray-800 rounded-full h-1.5 shrink-0">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(t.count / Math.max(...topTags.map((x) => x.count))) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Топ коллекций */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Файлов по коллекциям</h2>
          {topCollections.length === 0 ? <p className="text-gray-500 text-sm">Нет данных</p> : (
            <div className="space-y-1.5">
              {topCollections.map((c) => (
                <div key={c.collectionId} className="grid grid-cols-[1fr_40px_80px] items-center gap-2 text-sm">
                  <span className="text-gray-400 truncate">{shorten(c.collectionName, 25)}</span>
                  <span className="font-mono text-xs text-gray-500 text-right">{c.count}</span>
                  <div className="bg-gray-800 rounded-full h-1.5 shrink-0">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(c.count / Math.max(...topCollections.map((x) => x.count))) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Топ групп */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Файлов по группам</h2>
          {topGroups.length === 0 ? <p className="text-gray-500 text-sm">Нет данных</p> : (
            <div className="space-y-1.5">
              {topGroups.map((g) => (
                <div key={g.groupId} className="grid grid-cols-[1fr_40px_80px] items-center gap-2 text-sm">
                  <span className="text-gray-400 truncate">{shorten(g.groupName, 18)} <span className="text-gray-600">({shorten(g.collectionName, 12)})</span></span>
                  <span className="font-mono text-xs text-gray-500 text-right">{g.count}</span>
                  <div className="bg-gray-800 rounded-full h-1.5 shrink-0">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(g.count / Math.max(...topGroups.map((x) => x.count))) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Средние */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Средние значения</h2>
          <div className="space-y-3">
            <AvgRow label="Тегов на файл" avg={distribution.tagsPerFile.avg} min={distribution.tagsPerFile.min} max={distribution.tagsPerFile.max} />
            <AvgRow label="Коллекций на файл" avg={distribution.collectionsPerFile.avg} min={distribution.collectionsPerFile.min} max={distribution.collectionsPerFile.max} />
            <AvgRow label="Групп на файл" avg={distribution.groupsPerFile.avg} min={distribution.groupsPerFile.min} max={distribution.groupsPerFile.max} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: string; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 flex flex-col">
      <span className="text-lg">{icon}</span>
      <span className="text-2xl font-bold text-white mt-0.5">{value}</span>
      <span className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{label}</span>
      {sub && <span className="text-[10px] text-gray-600 mt-1 leading-tight">{sub}</span>}
    </div>
  );
}

function AvgRow({ label, avg, min, max }: { label: string; avg: number; min: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-gray-200">{avg}</span>
      </div>
      <div className="flex justify-between text-[11px] text-gray-600 mt-0.5">
        <span>мин {min}</span>
        <span>макс {max}</span>
      </div>
    </div>
  );
}
