/**
 * Дымовой тест собранного пакета: рендерим пикер через react-dom/server и
 * проверяем разметку и экспорты `goemoji/discord`. Запуск: `pnpm smoke` (после `pnpm build`).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmojiPicker, parseEmojiData, type EmojiData } from "../dist/index.js";
import { customEmojiUrl, parseCustomEmoji } from "../dist/discord.js";

const serverEmojis = [
  { id: "42", name: "blob", animated: true },
  { id: "43", name: "party_parrot", animated: false },
];

// Небольшой словарь: серверная секция попадает в первое окно виртуализации.
const tiny: EmojiData = {
  locale: "ru",
  categories: [{ key: "smileys-emotion", label: "Смайлики" }],
  emojis: [
    { value: "😀", label: "улыбается", tags: "улыбка", category: 0 },
    { value: "👋", label: "машет рукой", tags: "привет", category: 0 },
  ],
};

const tinyHtml = renderToStaticMarkup(
  createElement(EmojiPicker, { data: tiny, serverEmojis, onSelect: () => {} }),
);
for (const fragment of [
  "ge-root",
  "ge-search",
  "ge-tabs",
  "ge-list",
  "ge-sizer",
  "ge-header",
  "Смайлики",
  "Сервер",
  "Поиск эмодзи",
  customEmojiUrl("42", true),
  "😀",
  "👋",
]) {
  assert.ok(tinyHtml.includes(fragment), `в разметке нет «${fragment}»`);
}

// Полный ru-словарь: проверяем, что рендер большого списка не падает.
const data = parseEmojiData(JSON.parse(readFileSync("data/ru.json", "utf8")));
const html = renderToStaticMarkup(
  createElement(EmojiPicker, { data, serverEmojis, locale: "ru", onSelect: () => {} }),
);
assert.ok(html.length > 5000, `подозрительно короткая разметка: ${html.length} символов`);
assert.ok(html.includes("Смайлики и люди"));
assert.ok(html.includes('role="listbox"'));

assert.equal(parseCustomEmoji("<a:blob:42>")?.animated, true);

console.log(
  `smoke: малый рендер ${(tinyHtml.length / 1024).toFixed(1)}KB, полный ${(html.length / 1024).toFixed(0)}KB — ок`,
);
