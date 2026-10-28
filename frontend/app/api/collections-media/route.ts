/* JSON fallback для /collections-media (связи файл↔коллекция) */
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { CollectionMedia } from "@/lib/types";

export async function GET() {
  const data = await readJson<CollectionMedia[]>("collections-media.json", []);
  return NextResponse.json(data);
}

/* Принимает и body.media, и body.fileId для совместимости */
export async function POST(req: Request) {
  const body = await req.json();
  const fileId = body.media ?? body.fileId;
  const { collectionId } = body;
  const data = await readJson<CollectionMedia[]>("collections-media.json", []);
  if (!data.some((e) => e.fileId === fileId && e.collectionId === collectionId)) {
    data.push({ fileId, collectionId });
  }
  await writeJson("collections-media.json", data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("media") ?? searchParams.get("fileId") ?? "";
  const collectionId = searchParams.get("collectionId");
  const data = await readJson<CollectionMedia[]>("collections-media.json", []);
  await writeJson("collections-media.json", data.filter((e) => !(e.fileId === fileId && e.collectionId === collectionId)));
  return NextResponse.json({ ok: true });
}
