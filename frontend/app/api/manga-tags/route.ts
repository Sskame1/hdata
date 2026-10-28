/* JSON fallback для /manga-tags — работает без бэкенда. */
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { MangaTag } from "@/lib/types";

export async function GET() {
  const tags = await readJson<MangaTag[]>("manga-tags.json", []);
  return NextResponse.json(tags);
}

export async function POST(req: Request) {
  const body = await req.json();
  const tags = await readJson<MangaTag[]>("manga-tags.json", []);
  const id = String(Date.now());
  const tag: MangaTag = { id, name: body.name, color: body.color ?? "#6b7280" };
  tags.push(tag);
  await writeJson("manga-tags.json", tags);
  return NextResponse.json(tag, { status: 201 });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const tags = await readJson<MangaTag[]>("manga-tags.json", []);
  await writeJson("manga-tags.json", tags.filter((t) => t.id !== id));
  const tm = await readJson<{ mangaId: string; tagId: string }[]>("manga-tag-media.json", []);
  await writeJson("manga-tag-media.json", tm.filter((e) => e.tagId !== id));
  return NextResponse.json({ ok: true });
}
