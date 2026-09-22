/**
 * Генерация slim-словарей из `emojibase-data`.
 *
 * Запуск: `pnpm data` (пакет `emojibase-data` — devDependency).
 *
 * Формат (v1):
 *   { v: 1, locale, categories: [{ key, label }], emojis: [[emoji, label, tags, category]] }
 *
 * Что выбрасываем: группу `component` (модификаторы тона кожи) и записи без
 * группы (региональные индикаторы флагов). Тона кожи не храним — варианты
 * генерируются в рантайме (`skinToneVariation`), сверено с emojibase: расхождений нет.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

const LOCALES = ["ru", "en"] as const;
const SOURCE = "node_modules/emojibase-data";
const OUT = "data";

type EmojibaseEmoji = {
  emoji: string;
  label: string;
  tags?: string[];
  group?: number;
  order?: number;
};
type EmojibaseMessages = {
  groups: { key: string; order: number; message: string }[];
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

for (const locale of LOCALES) {
  const emojis = JSON.parse(
    readFileSync(join(SOURCE, locale, "data.json"), "utf8"),
  ) as EmojibaseEmoji[];
  const messages = JSON.parse(
    readFileSync(join(SOURCE, locale, "messages.json"), "utf8"),
  ) as EmojibaseMessages;

  const groups = messages.groups
    .filter((group) => group.key !== "component")
    .sort((a, b) => a.order - b.order);
  const categoryOf = new Map(groups.map((group, index) => [group.order, index]));

  const rows = emojis
    .filter((emoji) => emoji.group !== undefined && categoryOf.has(emoji.group))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((emoji) => [
      emoji.emoji,
      emoji.label,
      (emoji.tags ?? []).join(" "),
      categoryOf.get(emoji.group as number) as number,
    ]);

  const slim = {
    v: 1,
    locale,
    categories: groups.map((group) => ({
      key: group.key,
      label: capitalize(group.message),
    })),
    emojis: rows,
  };
  const json = JSON.stringify(slim) + "\n";
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${locale}.json`), json);

  console.log(
    `${locale}: ${rows.length} эмодзи, ${groups.length} категорий, ` +
      `${(Buffer.byteLength(json) / 1024).toFixed(0)}KB raw, ` +
      `${(gzipSync(json).length / 1024).toFixed(1)}KB gzip, ` +
      `${(brotliCompressSync(json).length / 1024).toFixed(1)}KB brotli`,
  );
}
