/* JSON fallback для /collections — работает без бэкенда.
   Хранит данные в frontend/data/collections.json. */
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { Collection } from "@/lib/types";

export async function GET() {
  const data = await readJson<Collection[]>("collections.json", []);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const data = await readJson<Collection[]>("collections.json", []);
  const id = String(Date.now());
  const collection: Collection = { id, name: body.name };
  data.push(collection);
  await writeJson("collections.json", data);
  return NextResponse.json(collection, { status: 201 });
}

/* DELETE каскадно чистит связи из collections-media.json */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const data = await readJson<Collection[]>("collections.json", []);
  await writeJson("collections.json", data.filter((c) => c.id !== id));
  const cm = await readJson<{ fileId: string; collectionId: string }[]>("collections-media.json", []);
  await writeJson("collections-media.json", cm.filter((e) => e.collectionId !== id));
  return NextResponse.json({ ok: true });
}
