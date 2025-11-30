#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const THRESHOLD = Number.parseInt(process.env.LINES || "720", 10);

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      files.push(...(await listFiles(full)));
    } else if (/\.(tsx?|jsx?|md)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function countLines(file) {
  const data = await fs.readFile(file, "utf8");
  return data.split(/\r?\n/).length;
}

async function main() {
  const files = await listFiles(SRC_DIR);
  const results = [];
  await Promise.all(
    files.map(async (f) => {
      try {
        const n = await countLines(f);
        if (n >= THRESHOLD) {
          results.push({ file: path.relative(ROOT, f), lines: n });
        }
      } catch {}
    })
  );
  results.sort((a, b) => b.lines - a.lines);
  const pretty = results.map((r) => `${String(r.lines).padStart(6, " ")}  ${r.file}`).join("\n");
  const json = JSON.stringify(results, null, 2);
  const mode = process.argv.includes("--json") ? "json" : "pretty";
  if (mode === "json") {
    process.stdout.write(`${json}\n`);
  } else {
    process.stdout.write(`Files with >= ${THRESHOLD} lines in src\n`);
    process.stdout.write(`${pretty}\n`);
  }
}

main().catch((_e) => {
  process.exit(1);
});
