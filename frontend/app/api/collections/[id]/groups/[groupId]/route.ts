import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { CollectionGroup } from "@/lib/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id: collectionId, groupId } = await params;
  const body = await req.json();
  const data = await readJson<CollectionGroup[]>("groups.json", []);
  const idx = data.findIndex((g) => g.id === groupId && g.collectionId === collectionId);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (body.name !== undefined) data[idx].name = body.name;
  await writeJson("groups.json", data);
  return NextResponse.json(data[idx]);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const { groupId } = await params;
  const data = await readJson<CollectionGroup[]>("groups.json", []);
  await writeJson("groups.json", data.filter((g) => g.id !== groupId));
  return NextResponse.json({ ok: true });
}
