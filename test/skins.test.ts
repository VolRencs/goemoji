import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SKIN_TONES, skinToneVariation, stripSkinTone, supportsSkinTone } from "../src/data.ts";

const ZWJ = "\u200D";

type EmojibaseEmoji = {
  emoji: string;
  skins?: { tone: number | number[]; emoji: string }[];
};

describe("тона кожи", () => {
  it("не трогает эмодзи без поддержки тонов", () => {
    assert.equal(supportsSkinTone("🏳️‍🌈"), false);
    assert.equal(skinToneVariation("🏳️‍🌈", "dark"), "🏳️‍🌈");
    assert.equal(skinToneVariation("😀", "medium"), "😀");
  });

  it("none снимает уже выбранный тон", () => {
    assert.equal(skinToneVariation("👋🏿", "none"), "👋");
    assert.equal(stripSkinTone("👋🏿"), "👋");
  });

  it("подставляет и меняет тон", () => {
    assert.equal(skinToneVariation("👋", "light"), "👋🏻");
    assert.equal(skinToneVariation("👋🏽", "dark"), "👋🏿");
  });

  it("🤝 внутри ZWJ-последовательности тон не получает", () => {
    assert.equal(
      skinToneVariation(`🧑${ZWJ}🤝${ZWJ}🧑`, "dark"),
      `🧑🏿${ZWJ}🤝${ZWJ}🧑🏿`,
    );
  });

  it("совпадает с данными emojibase для всех тонов ru-словаря", () => {
    const emojis = JSON.parse(
      readFileSync("node_modules/emojibase-data/ru/data.json", "utf8"),
    ) as EmojibaseEmoji[];

    const mismatches: string[] = [];
    let compared = 0;

    for (const emoji of emojis) {
      for (const skin of emoji.skins ?? []) {
        if (typeof skin.tone !== "number") continue;
        const tone = SKIN_TONES[skin.tone - 1];
        if (!tone) continue;
        compared++;
        const generated = skinToneVariation(emoji.emoji, tone);
        if (generated !== skin.emoji) {
          mismatches.push(`${emoji.emoji} + ${tone} → ${generated}, ожидалось ${skin.emoji}`);
        }
      }
    }

    assert.ok(compared > 1500, `сравнений: ${compared}`);
    assert.deepEqual(mismatches.slice(0, 5), []);
  });
});
