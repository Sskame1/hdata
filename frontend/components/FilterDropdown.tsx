"use client";

/* Универсальный мультиселект с поиском.
   Используется для фильтрации по тегам и коллекциям.
   Generic: работает с любым типом, у которого есть id.
   Состояние (selected) управляется родителем. */
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

type Props<T extends { id: string }> = {
  icon: string;
  label: string;
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onSelectAll?: (ids: string[]) => void;
  getLabel: (item: T) => string;
  getPrefix?: (item: T) => React.ReactNode;
  getPreviewUrl?: (item: T) => string | null;
  className?: string;
};

export default function FilterDropdown<T extends { id: string }>({ icon, label, items, selectedIds, onToggle, onClear, onSelectAll, getLabel, getPrefix, getPreviewUrl, className }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const [hoverItem, setHoverItem] = useState<T | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  /* Закрытие при клике вне дропдауна */
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = query ? items.filter((i) => getLabel(i).toLowerCase().includes(query.toLowerCase())) : items;

  return (
    <div className={className ?? "px-6 py-2 border-gray-800/60 text-sm"}>
      <div className="relative inline-block" ref={ref}>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-lg bg-gray-900 border border-gray-700 px-3 py-1.5 text-gray-300 hover:border-gray-500 transition min-w-[140px]">
          <span>{icon}</span>
          <span className="truncate flex-1 text-left">{selectedIds.length > 0 ? `Выбрано ${label} (${selectedIds.length})` : `Все ${label}`}</span>
          <span className={`transition ${open ? "rotate-180" : ""}`}>▾</span>
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-60 z-30 rounded-lg bg-gray-900 border border-gray-700 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-800">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Поиск ${label}...`}
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {onSelectAll && filtered.length > 0 && !filtered.every((i) => selectedIds.includes(i.id)) && (
                <button onClick={() => onSelectAll(filtered.map((i) => i.id))} className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-gray-800 transition border-b border-gray-800">
                  Выбрать все{query ? ` (${filtered.length})` : ""}
                </button>
              )}
              {selectedIds.length > 0 && (
                <button onClick={() => { onClear(); setQuery(""); }} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 transition border-b border-gray-800">
                  Снять все
                </button>
              )}
              {filtered.map((item) => {
                const active = selectedIds.includes(item.id);
                const previewUrl = getPreviewUrl?.(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => onToggle(item.id)}
                    onMouseEnter={(e) => { if (previewUrl) { setHoverItem(item); setHoverPos({ x: e.currentTarget.getBoundingClientRect().right + 8, y: e.currentTarget.getBoundingClientRect().top }); } }}
                    onMouseLeave={() => setHoverItem(null)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition flex items-center gap-2 ${active ? "text-blue-400" : "text-gray-300"}`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${active ? "bg-blue-600 border-blue-500" : "border-gray-600"}`}>
                      {active ? "✓" : ""}
                    </span>
                    {getPrefix?.(item)}
                    <span className="truncate">{getLabel(item)}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="px-3 py-4 text-xs text-gray-500 text-center">Ничего не найдено</p>}
            </div>
          </div>
        )}
      </div>
      {hoverItem && getPreviewUrl && (() => {
        const url = getPreviewUrl(hoverItem);
        if (!url) return null;
        return (
          <div
            className="fixed z-[100] pointer-events-none rounded-lg overflow-hidden border border-gray-700 shadow-2xl bg-gray-900"
            style={{ left: hoverPos.x, top: hoverPos.y, width: 160, height: 160 }}
          >
            <Image unoptimized src={url} alt="" fill className="object-cover" />
          </div>
        );
      })()}
    </div>
  );
}
