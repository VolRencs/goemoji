/**
 * Бюджет размера: падаем, если бандл или данные распухли.
 * Запуск: `pnpm size` (после `pnpm build`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

/** Бандл — это `dist/index.js` вместе с его чанками. */
function bundleBytes(entry: string): { bytes: Buffer; files: string[] } {
  const directory = entry.slice(0, entry.lastIndexOf("/"));
  const chunks = readdirSync(directory).filter((name) => name.startsWith("chunk-") && name.endsWith(".js"));
  const files = [entry, ...chunks.map((name) => `${directory}/${name}`)];
  return { bytes: Buffer.concat(files.map((file) => readFileSync(file))), files };
}

const BUDGETS = [
  { file: "dist/index.js", limit: 9 * 1024, label: "JS" },
  { file: "dist/styles.css", limit: 5 * 1024, label: "CSS" },
  { file: "data/ru.json", limit: 55 * 1024, label: "данные ru" },
  { file: "data/en.json", limit: 45 * 1024, label: "данные en" },
] as const;

let failed = false;

for (const { file, limit, label } of BUDGETS) {
  let size: number;
  let details: string = file;
  try {
    if (file.startsWith("dist/index")) {
      const bundle = bundleBytes(file);
      size = gzipSync(bundle.bytes).length;
      details = bundle.files.join(" + ");
    } else {
      size = gzipSync(readFileSync(file)).length;
    }
  } catch {
    console.error(`✗ ${label}: файл ${file} не найден — сначала собери проект`);
    failed = true;
    continue;
  }
  const ok = size <= limit;
  failed ||= !ok;
  console.log(
    `${ok ? "✓" : "✗"} ${label}: ${(size / 1024).toFixed(1)}KB gzip ` +
      `(бюджет ${(limit / 1024).toFixed(0)}KB) — ${details}`,
  );
}

if (failed) {
  console.error("\nБюджет размера превышен.");
  process.exit(1);
}
console.log("\nБюджет размера в порядке.");
