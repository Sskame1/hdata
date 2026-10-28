import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/store";
import type { Tag } from "@/lib/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const tags = await readJson<Tag[]>("tags.json", []);
  const idx = tags.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (body.name !== undefined) tags[idx].name = body.name;
  if (body.color !== undefined) tags[idx].color = body.color;
  await writeJson("tags.json", tags);
  return NextResponse.json(tags[idx]);
}
