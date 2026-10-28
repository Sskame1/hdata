import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { FileGroup } from "@/lib/types";

export async function GET() {
  const data = await readJson<FileGroup[]>("groups-media.json", []);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const fileId = body.media ?? body.fileId;
  const { groupId } = body;
  const data = await readJson<FileGroup[]>("groups-media.json", []);
  if (!data.some((e) => e.fileId === fileId && e.groupId === groupId)) {
    data.push({ fileId, groupId });
  }
  await writeJson("groups-media.json", data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("media") ?? searchParams.get("fileId") ?? "";
  const groupId = searchParams.get("groupId") ?? "";
  const data = await readJson<FileGroup[]>("groups-media.json", []);
  await writeJson("groups-media.json", data.filter((e) => !(e.fileId === fileId && e.groupId === groupId)));
  return NextResponse.json({ ok: true });
}
