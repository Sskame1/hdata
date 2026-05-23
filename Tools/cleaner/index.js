import { readdir, unlink } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

const EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

async function main() {
  const dir = (await ask("Path: ")).trim().replace(/^"|"$/g, "");
  if (!dir) {
    console.log("No path provided.");
    rl.close();
    return;
  }

  try {
    const files = await readdir(dir);
    const toDelete = files.filter((f) => {
      const ext = f.split(".").pop()?.toLowerCase();
      return ext && EXTENSIONS.has(ext);
    });

    if (toDelete.length === 0) {
      console.log("No image files found.");
      rl.close();
      return;
    }

    console.log(`Found ${toDelete.length} file(s):`);
    for (const f of toDelete) console.log(`  ${f}`);

    const answer = await ask(`Delete? (y/N): `);
    if (answer.toLowerCase() !== "y") {
      console.log("Cancelled.");
      rl.close();
      return;
    }

    let deleted = 0;
    for (const f of toDelete) {
      await unlink(join(dir, f));
      deleted++;
    }
    console.log(`Deleted ${deleted} file(s).`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  rl.close();
}

main();
