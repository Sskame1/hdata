import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { CollectionGroup } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await readJson<CollectionGroup[]>("groups.json", []);
  return NextResponse.json(data.filter((g) => g.collectionId === id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const name: string = body.name ?? "";
  const data = await readJson<CollectionGroup[]>("groups.json", []);
  const group: CollectionGroup = {
    id: crypto.randomUUID(),
    name,
    collectionId: id,
  };
  data.push(group);
  await writeJson("groups.json", data);
  return NextResponse.json(group);
}
