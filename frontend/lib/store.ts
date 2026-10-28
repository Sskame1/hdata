/* Серверная read/write JSON.
   Используется только в app/api/* (Next.js Route Handlers) для работы в автономном режиме.
   Хранит теги/коллекции в frontend/data/*.json. */
import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(dataDir, file), "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(file: string, data: T): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, file), JSON.stringify(data, null, 2), "utf-8");
}
