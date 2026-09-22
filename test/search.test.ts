import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchEmojis, serverEmojiToEmoji, type Emoji } from "../src/data.ts";

function emoji(value: string, label: string, tags = "", category = 0): Emoji {
  return { value, label, tags, category };
}

const heart = emoji("❤️", "алое сердце", "любовь красный");
const wave = emoji("👋", "машет рукой", "взмах привет прощание рука");
const cat = emoji("🐱", "кошачье лицо", "кошка кот животное");
const parrot = serverEmojiToEmoji({ id: "42", name: "party_parrot", animated: false });
const all = [heart, wave, cat, parrot];

describe("searchEmojis", () => {
  it("пустой запрос возвращает копию списка", () => {
    const result = searchEmojis(all, "   ");
    assert.deepEqual(result, all);
    assert.notEqual(result, all);
  });

  it("ищет по названию без учёта регистра", () => {
    assert.deepEqual(searchEmojis(all, "СЕРДЦЕ"), [heart]);
  });

  it("ищет по тегам", () => {
    assert.deepEqual(searchEmojis(all, "кошка"), [cat]);
    assert.deepEqual(searchEmojis(all, "взмах"), [wave]);
  });

  it("название весит больше тега", () => {
    const labelHit = emoji("1️⃣", "сердце", "");
    const tagHit = emoji("2️⃣", "что-то", "сердце");
    assert.deepEqual(searchEmojis([tagHit, labelHit], "сердце"), [labelHit, tagHit]);
  });

  it("точное совпадение выше префикса, префикс выше подстроки", () => {
    const exact = emoji("1️⃣", "кот", "");
    const prefix = emoji("2️⃣", "котик", "");
    const inner = emoji("3️⃣", "рокот", "");
    assert.deepEqual(searchEmojis([inner, prefix, exact], "кот"), [exact, prefix, inner]);
  });

  it("находит серверные эмодзи по частям имени", () => {
    assert.deepEqual(searchEmojis(all, "parrot"), [parrot]);
    assert.deepEqual(searchEmojis(all, "party_parrot"), [parrot]);
  });

  it("возвращает пустой список, если ничего не найдено", () => {
    assert.deepEqual(searchEmojis(all, "зебра"), []);
  });
});
