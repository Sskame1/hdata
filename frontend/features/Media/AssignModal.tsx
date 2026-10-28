"use client";

/* AssignModal — массовое назначение/снятие тегов, коллекций и групп
   для выделенных файлов галереи. Используется в Media (/media). */
import { useState } from "react";
import type { Tag, Collection, CollectionGroup } from "@/lib/types";
import { groupsApi } from "@/lib/api";

type AssignModalProps = {
  mode: "tags" | "collections" | "groups";
  action: "add" | "remove";
  fileCount: number;
  tags: Tag[];
  collections: Collection[];
  collectionGroups: CollectionGroup[];
  initialCollectionId: string | null;
  applying: boolean;
  onClose: () => void;
  onApply: (ids: string[]) => Promise<void>;
  onGroupCreated: (group: CollectionGroup) => void;
};

const AssignModal = ({ mode, action, fileCount, tags, collections, collectionGroups, initialCollectionId, applying, onClose, onApply, onGroupCreated }: AssignModalProps) => {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [groupCollectionId, setGroupCollectionId] = useState<string | null>(initialCollectionId);
  const [collectionQuery, setCollectionQuery] = useState("");

  const items = mode === "tags" ? tags : mode === "collections" ? collections : collectionGroups;
  const filtered = mode === "groups" && groupCollectionId
    ? (items as CollectionGroup[]).filter((g) => g.collectionId === groupCollectionId)
    : query
      ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
      : items;

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const title = mode === "tags" ? "🏷️ Назначить теги"
    : mode === "collections" ? "📂 Назначить коллекции"
    : action === "add" ? "🔸 Назначить группы"
    : "🔸 Удалить из групп";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-0" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer">&times;</button>
        </div>
        <p className="text-xs text-gray-500 mb-2 sm:mb-3">Выбрано файлов: {fileCount}</p>

        {mode !== "groups" && (
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "tags" ? "Поиск тега..." : "Поиск коллекции..."} className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500 mb-2 sm:mb-3" />
        )}

        {mode === "groups" && (
          <div className="mb-2 sm:mb-3">
            {groupCollectionId ? (
              <div className="flex items-center justify-between rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 sm:py-2 mb-2">
                <span className="text-xs sm:text-sm text-gray-200 truncate">📂 {collections.find((c) => c.id === groupCollectionId)?.name}</span>
                <button onClick={() => { setGroupCollectionId(null); setCollectionQuery(""); setChecked(new Set()); }} className="text-xs text-gray-500 hover:text-gray-200 shrink-0 ml-2">сменить</button>
              </div>
            ) : (
              <>
                <input
                  value={collectionQuery}
                  onChange={(e) => setCollectionQuery(e.target.value)}
                  placeholder="Найти коллекцию..."
                  autoFocus
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500 mb-2"
                />
                <div className="max-h-40 overflow-y-auto space-y-0.5 mb-2">
                  {collections
                    .filter((c) => !collectionQuery.trim() || c.name.toLowerCase().includes(collectionQuery.trim().toLowerCase()))
                    .map((c) => (
                      <button key={c.id} onClick={() => { setGroupCollectionId(c.id); setChecked(new Set()); }} className="w-full text-left px-3 py-1.5 rounded-lg text-xs sm:text-sm text-gray-300 hover:bg-gray-800 transition truncate">
                        📂 {c.name}
                      </button>
                    ))}
                  {collections.filter((c) => !collectionQuery.trim() || c.name.toLowerCase().includes(collectionQuery.trim().toLowerCase())).length === 0 && (
                    <p className="text-xs text-gray-600 text-center py-2">Нет коллекций</p>
                  )}
                </div>
              </>
            )}
            {groupCollectionId && (
              <div className="flex gap-1">
                <input
                  placeholder="Создать группу..."
                  className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      const name = input.value.trim();
                      if (!name || !groupCollectionId) return;
                      const g = await groupsApi.create(groupCollectionId, name);
                      onGroupCreated(g);
                      input.value = "";
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 mb-3 sm:mb-4 max-h-48 sm:max-h-64">
          {filtered.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <button key={item.id} onClick={() => toggle(item.id)} className={`w-full text-left px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition flex items-center gap-2 sm:gap-3 ${isChecked ? "bg-blue-600/20 text-blue-300" : "text-gray-400 hover:bg-gray-800"}`}>
                <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border flex items-center justify-center text-[8px] sm:text-[9px] shrink-0 ${isChecked ? "bg-blue-500 border-blue-500" : "border-gray-600"}`}>
                  {isChecked ? "✓" : ""}
                </span>
                {"color" in item && <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ backgroundColor: (item as Tag).color }} />}
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-xs text-gray-600 text-center py-4">{mode === "groups" && !groupCollectionId ? "Выберите коллекцию" : "Нет совпадений"}</p>}
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg bg-gray-800 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-400 hover:text-white transition">Отмена</button>
          <button onClick={() => onApply(Array.from(checked))} disabled={applying || checked.size === 0} className={`flex-1 rounded-lg py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition disabled:opacity-50 ${action === "remove" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}>
            {applying ? "..." : action === "remove" ? `Удалить (${checked.size})` : `Применить (${checked.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignModal;
