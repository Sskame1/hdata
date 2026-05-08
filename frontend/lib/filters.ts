import type { MediaItem, Collection, SearchOptions } from "@/types";

export function filterMediaItems(
  items: MediaItem[],
  activeFilter: string,
  options: SearchOptions,
): MediaItem[] {
  let filtered = items;

  if (activeFilter !== "videos") {
    filtered = filtered.filter(
      (i) =>
        i.mimetype !== "image/jpeg" ||
        !items.some(
          (v) =>
            v.filename.replace(/\.[^/.]+$/, "") ===
              i.filename.replace(/\.[^/.]+$/, "") &&
            /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(v.filename),
        ),
    );
  }

  if (options.query) {
    const q = options.query.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.originalName.toLowerCase().includes(q) ||
        item.filename.toLowerCase().includes(q),
    );
  }

  if (options.tags.length > 0) {
    const hasNoTags = options.tags.includes("@NoTags");
    const hasNoCollection = options.tags.includes("@NoCollection");

    if (hasNoTags && hasNoCollection) {
      filtered = filtered.filter(
        (item) =>
          (!item.tags || item.tags.length === 0) && !item.collection,
      );
    } else if (hasNoTags) {
      filtered = filtered.filter(
        (item) => !item.tags || item.tags.length === 0,
      );
    } else if (hasNoCollection) {
      filtered = filtered.filter((item) => !item.collection);
    } else if (options.tagMode === "AND") {
      filtered = filtered.filter((item) =>
        options.tags.every((tag) => item.tags?.includes(tag)),
      );
    } else {
      filtered = filtered.filter((item) =>
        options.tags.some((tag) => item.tags?.includes(tag)),
      );
    }
  }

  if (options.dateFrom) {
    const fromDate = new Date(options.dateFrom);
    filtered = filtered.filter((item) => {
      if (!item.createdAt) return false;
      return new Date(item.createdAt) >= fromDate;
    });
  }

  if (options.dateTo) {
    const toDate = new Date(options.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((item) => {
      if (!item.createdAt) return false;
      return new Date(item.createdAt) <= toDate;
    });
  }

  if (options.sizeMin !== undefined) {
    filtered = filtered.filter((item) => item.size >= options.sizeMin!);
  }

  if (options.sizeMax !== undefined) {
    filtered = filtered.filter((item) => item.size <= options.sizeMax!);
  }

  switch (activeFilter) {
    case "all":
      break;
    case "images":
      filtered = filtered.filter((item) => {
        const hasVideoSibling = items.some(
          (i) =>
            i.filename.replace(/\.[^/.]+$/, "") ===
              item.filename.replace(/\.[^/.]+$/, "") &&
            /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(i.filename),
        );
        return item.mimetype.startsWith("image/") && !hasVideoSibling;
      });
      break;
    case "videos":
      filtered = items.filter((item) =>
        /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(item.filename),
      );
      break;
    case "docs":
      filtered = filtered.filter(
        (item) =>
          item.mimetype.startsWith("application/") ||
          [
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "zip", "rar", "7z", "txt", "json", "xml", "html",
            "css", "js", "ts",
          ].some((ext) => item.filename.toLowerCase().endsWith(ext)),
      );
      break;
    default:
      if (activeFilter.startsWith("collection:")) {
        const collectionId = activeFilter.replace("collection:", "");
        filtered = filtered.filter((item) => item.collection === collectionId);
      }
      break;
  }

  return filtered;
}

export function enrichCollections(
  items: MediaItem[],
  collections: Collection[],
): MediaItem[] {
  return items.map((item) => ({
    ...item,
    collectionName: item.collection
      ? collections.find((c) => c.id === item.collection)?.name ?? null
      : null,
  }));
}
