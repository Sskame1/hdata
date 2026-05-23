import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { join, resolve } from "path";
import { createInterface } from "readline";
import { pipeline } from "stream/promises";

const rl = createInterface({ input: process.stdin, output: process.stdout });

const ask = (q) => new Promise((r) => rl.question(q, r));

function getName(url, headers) {
  const cd = headers.get("content-disposition");
  if (cd) {
    const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (m) return m[1].replace(/['"]/g, "");
  }
  const u = new URL(url);
  const base = u.pathname.split("/").pop();
  if (base && !base.endsWith("/")) return decodeURIComponent(base);
  return "downloaded_file";
}

async function main() {
  const url = (await ask("URL: ")).trim();
  if (!url) {
    console.log("No URL provided.");
    rl.close();
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`HTTP ${res.status} ${res.statusText}`);
      rl.close();
      return;
    }

    const name = getName(url, res.headers);
    const dir = resolve(join(import.meta.dirname, "downloads"));
    await mkdir(dir, { recursive: true });
    const dest = join(dir, name);

    const len = parseInt(res.headers.get("content-length") || "0", 10);
    let downloaded = 0;

    const ws = createWriteStream(dest);
    const reader = res.body.getReader();

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        downloaded += value.length;
        ws.write(value);
        if (len) {
          const pct = ((downloaded / len) * 100).toFixed(1);
          process.stdout.write(`\r${pct}%  ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
        } else {
          process.stdout.write(`\r${(downloaded / 1024 / 1024).toFixed(1)} MB`);
        }
      }
    };

    await pump();
    ws.end();
    console.log(`\nSaved → ${dest}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }

  rl.close();
}

main();
