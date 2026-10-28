/* JSON fallback для /tags — работает без бэкенда.
   Хранит данные в frontend/data/tags.json. */
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { Tag } from "@/lib/types";

export async function GET() {
  const tags = await readJson<Tag[]>("tags.json", []);
  return NextResponse.json(tags);
}

export async function POST(req: Request) {
  const body = await req.json();
  const tags = await readJson<Tag[]>("tags.json", []);
  const id = String(Date.now());
  const tag: Tag = { id, name: body.name, color: body.color ?? "#6b7280" };
  tags.push(tag);
  await writeJson("tags.json", tags);
  return NextResponse.json(tag, { status: 201 });
}

/* DELETE каскадно чистит связи из tags-media.json */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const tags = await readJson<Tag[]>("tags.json", []);
  await writeJson("tags.json", tags.filter((t) => t.id !== id));
  const tm = await readJson<{ fileId: string; tagId: string }[]>("tags-media.json", []);
  await writeJson("tags-media.json", tm.filter((e) => e.tagId !== id));
  return NextResponse.json({ ok: true });
}
