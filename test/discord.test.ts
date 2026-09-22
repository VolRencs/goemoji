import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customEmojiToString,
  customEmojiUrl,
  normalizeEmojiText,
  parseCustomEmoji,
  sameEmojiValue,
} from "../src/discord.ts";

describe("parseCustomEmoji", () => {
  it("разбирает обычный серверный эмодзи", () => {
    assert.deepEqual(parseCustomEmoji("<:party_parrot:123456789012345678>"), {
      name: "party_parrot",
      id: "123456789012345678",
      animated: false,
    });
  });

  it("разбирает анимированный", () => {
    assert.deepEqual(parseCustomEmoji("<a:blob:987654321098765432>"), {
      name: "blob",
      id: "987654321098765432",
      animated: true,
    });
  });

  it("возвращает null для юникода и мусора", () => {
    for (const value of ["😀", "party_parrot", "<:name>", "<:name:abc>", "<@123>", "", "<:name:1> "]) {
      assert.equal(parseCustomEmoji(value), null, value);
    }
  });
});

describe("customEmojiToString", () => {
  it("собирает строку без флага и с флагом", () => {
    assert.equal(customEmojiToString({ name: "blob", id: "1" }), "<:blob:1>");
    assert.equal(customEmojiToString({ name: "blob", id: "1", animated: true }), "<a:blob:1>");
  });

  it("переживает round-trip", () => {
    const parsed = parseCustomEmoji("<a:cat_jam:42>");
    assert.ok(parsed);
    assert.equal(customEmojiToString(parsed), "<a:cat_jam:42>");
  });
});

describe("customEmojiUrl", () => {
  it("подставляет формат и размер", () => {
    assert.equal(customEmojiUrl("42"), "https://cdn.discordapp.com/emojis/42.png?size=48");
    assert.equal(
      customEmojiUrl("42", true, 96),
      "https://cdn.discordapp.com/emojis/42.gif?size=96",
    );
  });
});

describe("normalizeEmojiText", () => {
  it("убирает вариационные селекторы и ZWJ", () => {
    assert.equal(normalizeEmojiText("❤️"), "❤");
    assert.equal(normalizeEmojiText("🏳️‍🌈"), "🏳🌈");
    assert.equal(normalizeEmojiText("😀"), "😀");
  });
});

describe("sameEmojiValue", () => {
  it("сравнивает серверные эмодзи по id", () => {
    assert.equal(sameEmojiValue("<a:blob:777>", "blob", "blob:777"), true);
    assert.equal(sameEmojiValue("<a:blob:777>", "blob", "blob:888"), false);
  });

  it("сравнивает юникод с точностью до селекторов", () => {
    assert.equal(sameEmojiValue("❤️", "❤", "❤"), true);
    assert.equal(sameEmojiValue("😀", "😀", "😀"), true);
    assert.equal(sameEmojiValue("😀", "😁", "😁"), false);
  });
});
