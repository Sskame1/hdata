"use client";

import { useState, useRef } from "react";
import { BACKEND_BASE } from "@/lib/api";

type CoverMode = "first" | "page" | "upload";

export default function AddMangaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverMode, setCoverMode] = useState<CoverMode>("first");
  const [coverPage, setCoverPage] = useState(1);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Введите название"); return; }
    if (pdfFiles.length === 0) { setError("Выберите хотя бы один PDF файл"); return; }
    if (coverMode === "upload" && !coverFile) { setError("Выберите изображение для обложки"); return; }

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("title", title.trim());
      if (description.trim()) form.append("description", description.trim());
      if (pageCount) form.append("pageCount", pageCount);

      if (coverMode === "first") form.append("coverFrom", "first");
      else if (coverMode === "page") form.append("coverFrom", `page:${coverPage}`);
      else if (coverMode === "upload") {
        form.append("coverFrom", "upload");
        if (coverFile) form.append("cover", coverFile);
      }

      for (const pdf of pdfFiles) {
        form.append("chapters", pdf);
      }

      const res = await fetch(`${BACKEND_BASE}/manga`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.slice(0, 200));
      }

      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Добавить мангу</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Название *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название тайтла"
              className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание"
              rows={2}
              className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">PDF файлы (главы) *</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setPdfFiles(files);
                if (files.length > 0 && !title) {
                  const name = files[0].name.replace(/\.pdf$/i, "");
                  setTitle(name);
                }
              }}
              className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-200 hover:file:bg-gray-700 cursor-pointer"
            />
            {pdfFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{pdfFiles.length} файлов</p>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Страниц в главе</label>
            <input
              type="number"
              min={1}
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              placeholder="Определится автоматически если не указано"
              className="w-full rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Превью</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-xl bg-gray-800/60 px-4 py-3 cursor-pointer hover:bg-gray-700/60 transition">
                <input
                  type="radio"
                  name="coverMode"
                  checked={coverMode === "first"}
                  onChange={() => setCoverMode("first")}
                  className="accent-blue-500"
                />
                <div>
                  <p className="text-sm font-medium">Первая страница</p>
                  <p className="text-xs text-gray-500">Использовать первую страницу первой главы</p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-gray-800/60 px-4 py-3 cursor-pointer hover:bg-gray-700/60 transition">
                <input
                  type="radio"
                  name="coverMode"
                  checked={coverMode === "page"}
                  onChange={() => setCoverMode("page")}
                  className="accent-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Выбрать страницу</p>
                  <p className="text-xs text-gray-500">Номер страницы из первой главы</p>
                  {coverMode === "page" && (
                    <input
                      type="number"
                      min={1}
                      value={coverPage}
                      onChange={(e) => setCoverPage(Math.max(1, parseInt(e.target.value) || 1))}
                      className="mt-2 w-24 rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-gray-100 outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-gray-800/60 px-4 py-3 cursor-pointer hover:bg-gray-700/60 transition">
                <input
                  type="radio"
                  name="coverMode"
                  checked={coverMode === "upload"}
                  onChange={() => setCoverMode("upload")}
                  className="accent-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Загрузить изображение</p>
                  <p className="text-xs text-gray-500">JPG, PNG — будет сжата до обложки</p>
                  {coverMode === "upload" && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="mt-2 w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-medium hover:bg-gray-700 transition cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer"
          >
            {uploading ? "Загрузка..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}
