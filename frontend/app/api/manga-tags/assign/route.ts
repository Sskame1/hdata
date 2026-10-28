/* JSON fallback для /manga-tags/assign (связи манга↔тег) */
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";

type MangaTagMedia = { mangaId: string; tagId: string };

export async function POST(req: Request) {
  const body = await req.json();
  const { mangaId, tagId } = body;
  const data = await readJson<MangaTagMedia[]>("manga-tag-media.json", []);
  if (!data.some((e) => e.mangaId === mangaId && e.tagId === tagId)) {
    data.push({ mangaId, tagId });
  }
  await writeJson("manga-tag-media.json", data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const mangaId = searchParams.get("mangaId") ?? "";
  const tagId = searchParams.get("tagId") ?? "";
  const data = await readJson<MangaTagMedia[]>("manga-tag-media.json", []);
  await writeJson("manga-tag-media.json", data.filter((e) => !(e.mangaId === mangaId && e.tagId === tagId)));
  return NextResponse.json({ ok: true });
}
