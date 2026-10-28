import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { Collection } from "@/lib/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data = await readJson<Collection[]>("collections.json", []);
  const idx = data.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (body.name !== undefined) data[idx].name = body.name;
  await writeJson("collections.json", data);
  return NextResponse.json(data[idx]);
}
