import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { MangaTag } from "@/lib/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const tags = await readJson<MangaTag[]>("manga-tags.json", []);
  const idx = tags.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (body.name !== undefined) tags[idx].name = body.name;
  if (body.color !== undefined) tags[idx].color = body.color;
  await writeJson("manga-tags.json", tags);
  return NextResponse.json(tags[idx]);
}
