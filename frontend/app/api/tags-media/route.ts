/* JSON fallback для /tags-media (связи файл↔тег) */
import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { TagMedia } from "@/lib/types";

export async function GET() {
  const data = await readJson<TagMedia[]>("tags-media.json", []);
  return NextResponse.json(data);
}

/* Принимает и body.media, и body.fileId для совместимости */
export async function POST(req: Request) {
  const body = await req.json();
  const fileId = body.media ?? body.fileId;
  const { tagId } = body;
  const data = await readJson<TagMedia[]>("tags-media.json", []);
  if (!data.some((e) => e.fileId === fileId && e.tagId === tagId)) {
    data.push({ fileId, tagId });
  }
  await writeJson("tags-media.json", data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("media") ?? searchParams.get("fileId") ?? "";
  const tagId = searchParams.get("tagId");
  const data = await readJson<TagMedia[]>("tags-media.json", []);
  await writeJson("tags-media.json", data.filter((e) => !(e.fileId === fileId && e.tagId === tagId)));
  return NextResponse.json({ ok: true });
}
