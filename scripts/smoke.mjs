import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmojiPicker, parseEmojiData } from "../dist/index.js";
import {
  customEmojiUrl,
  parseCustomEmoji,
  stripVariationSelectors,
  toDiscordEmoji,
  toDiscordReaction,
} from "../dist/discord.js";

const serverEmojis = [
  { id: "42", name: "blob", animated: true },
  { id: "43", name: "party_parrot", animated: false },
];

const tiny = {
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
  'aria-label="улыбается"',
  customEmojiUrl("42", true),
  "😀",
  "👋",
]) {
  assert.ok(tinyHtml.includes(fragment), `в разметке нет «${fragment}»`);
}

assert.ok(
  tinyHtml.indexOf("Сервер") < tinyHtml.indexOf("Смайлики"),
  "секция и вкладка «Сервер» должны идти перед юникод-категориями",
);

const data = parseEmojiData(JSON.parse(readFileSync("data/ru.json", "utf8")));
assert.ok(data.emojis.length > 1900, `эмодзи: ${data.emojis.length}`);
const html = renderToStaticMarkup(
  createElement(EmojiPicker, { data, serverEmojis, locale: "ru", onSelect: () => {} }),
);
assert.ok(html.length > 5000, `подозрительно короткая разметка: ${html.length} символов`);
assert.ok(html.includes("Смайлики и эмоции"));
assert.ok(html.includes('role="listbox"'));

assert.equal(parseCustomEmoji("<a:blob:42>")?.animated, true);
assert.equal(stripVariationSelectors("❤️"), "❤");
assert.deepEqual(toDiscordEmoji("<a:blob:42>"), { id: "42", name: "blob", animated: true });
assert.equal(toDiscordReaction("<:blob:42>"), "blob:42");

const indexBundle = readFileSync("dist/index.js", "utf8");
assert.ok(indexBundle.startsWith('"use client";'), "в dist/index.js пропала директива use client");
assert.ok(
  !readFileSync("dist/discord.js", "utf8").includes("react"),
  "в goemoji/discord попал React",
);

console.log(
  `smoke: малый рендер ${(tinyHtml.length / 1024).toFixed(1)}KB, полный ${(html.length / 1024).toFixed(0)}KB — ок`,
);
