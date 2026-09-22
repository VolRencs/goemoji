import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseEmojiData, serverEmojiToEmoji } from "../src/data.ts";

const minimal = {
  v: 1,
  locale: "ru",
  categories: [{ key: "smileys-emotion", label: "Смайлики" }],
  emojis: [["😀", "улыбается", "улыбка смех", 0]],
};

describe("parseEmojiData", () => {
  it("разбирает корректные данные", () => {
    const data = parseEmojiData(minimal);
    assert.equal(data.locale, "ru");
    assert.equal(data.categories.length, 1);
    assert.deepEqual(data.emojis[0], {
      value: "😀",
      label: "улыбается",
      tags: "улыбка смех",
      category: 0,
    });
  });

  it("подставляет локаль по умолчанию", () => {
    const { locale: _locale, ...rest } = minimal;
    assert.equal(parseEmojiData(rest).locale, "en");
  });

  it("разворачивает namespace JSON-модуля", () => {
    assert.deepEqual(parseEmojiData({ default: minimal }), parseEmojiData(minimal));
  });

  it("ругается на чужие данные", () => {
    assert.throws(() => parseEmojiData(null), /v: 1/);
    assert.throws(() => parseEmojiData({ v: 2 }), /v: 1/);
    assert.throws(() => parseEmojiData({ v: 1, categories: [], emojis: {} }), /categories/);
    assert.throws(
      () => parseEmojiData({ v: 1, categories: [{}], emojis: [] }),
      /категория/,
    );
    assert.throws(
      () => parseEmojiData({ v: 1, categories: minimal.categories, emojis: [["😀"]] }),
      /повреждён/,
    );
    assert.throws(
      () =>
        parseEmojiData({
          v: 1,
          categories: minimal.categories,
          emojis: [["", "улыбается", "", 0]],
        }),
      /пустой/,
    );
    assert.throws(
      () =>
        parseEmojiData({
          v: 1,
          categories: minimal.categories,
          emojis: [["😀", "улыбается", "", 5]],
        }),
      /неизвестную категорию/,
    );
  });
});

describe("serverEmojiToEmoji", () => {
  it("собирает значение Discord и теги для поиска", () => {
    const emoji = serverEmojiToEmoji({ id: "42", name: "party_parrot", animated: true });
    assert.equal(emoji.value, "<a:party_parrot:42>");
    assert.equal(emoji.label, "party_parrot");
    assert.deepEqual(emoji.server, { id: "42", animated: true });
    assert.match(emoji.tags, /party parrot/);
  });
});

describe("data/*.json", () => {
  for (const locale of ["ru", "en"]) {
    it(`${locale}: словарь валиден`, () => {
      const raw: unknown = JSON.parse(readFileSync(`data/${locale}.json`, "utf8"));
      const data = parseEmojiData(raw);

      assert.equal(data.locale, locale);
      assert.equal(data.categories.length, 9);
      assert.ok(data.emojis.length > 1800, `эмодзи: ${data.emojis.length}`);

      const seen = new Set<string>();
      const used = new Set<number>();
      for (const emoji of data.emojis) {
        assert.ok(emoji.label.length > 0);
        assert.ok(!seen.has(emoji.value), `дубликат: ${emoji.value}`);
        seen.add(emoji.value);
        used.add(emoji.category);
      }
      assert.equal(used.size, data.categories.length, "есть пустые категории");

      for (const category of data.categories) {
        assert.ok(category.key.length > 0 && category.label.length > 0);
        assert.equal(category.label[0], category.label[0]?.toUpperCase(), category.label);
      }
    });
  }
});
