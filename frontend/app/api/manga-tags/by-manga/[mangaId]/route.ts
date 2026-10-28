/* JSON fallback для /manga-tags/by-manga/:mangaId */
import { NextResponse } from "next/server";
import { readJson } from "@/lib/store";
import type { MangaTag } from "@/lib/types";

type MangaTagMedia = { mangaId: string; tagId: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mangaId: string }> }
) {
  const { mangaId } = await params;
  const links = await readJson<MangaTagMedia[]>("manga-tag-media.json", []);
  const tags = await readJson<MangaTag[]>("manga-tags.json", []);
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const result = links
    .filter((l) => l.mangaId === mangaId)
    .map((l) => ({ mangaId: l.mangaId, tagId: l.tagId, tag: tagMap.get(l.tagId) }))
    .filter((e) => e.tag);
  return NextResponse.json(result);
}
