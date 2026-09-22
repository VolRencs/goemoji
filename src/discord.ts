/**
 * Помощники для серверных эмодзи Discord. Без React — модуль
 * `goemoji/discord` можно импортировать и в Node (бот, API-роуты).
 */

export type CustomEmoji = { id: string; name: string; animated: boolean };

const CUSTOM_EMOJI = /^<(a?):([\w~]+):(\d+)>$/;

/** Разбирает `<:name:id>` / `<a:name:id>`; для обычного эмодзи вернёт `null`. */
export function parseCustomEmoji(value: string): CustomEmoji | null {
  const match = CUSTOM_EMOJI.exec(value);
  if (!match) return null;
  return { name: match[2]!, id: match[3]!, animated: match[1] === "a" };
}

/** Собирает строку серверного эмодзи для Discord API и БД. */
export function customEmojiToString(emoji: Omit<CustomEmoji, "animated"> & { animated?: boolean }): string {
  return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}

/** Ссылка на картинку эмодзи для `<img>`. */
export function customEmojiUrl(id: string, animated = false, size = 48): string {
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=${size}`;
}

/**
 * Нормализует юникод-эмодзи для сравнения: убирает вариационные селекторы
 * (U+FE0E/U+FE0F) и ZWJ. Уже используется ботом для сопоставления реакций.
 */
export function normalizeEmojiText(value: string): string {
  return value.replace(/[\uFE0E\uFE0F\u200D]/gu, "");
}

/**
 * Сравнивает сохранённое значение эмодзи с названием/идентификатором реакции:
 * серверные — по id, юникод — по нормализованному виду.
 */
export function sameEmojiValue(saved: string, name: string | null, identifier: string): boolean {
  const custom = parseCustomEmoji(saved);
  if (custom) return identifier.endsWith(custom.id);
  return normalizeEmojiText(saved) === normalizeEmojiText(name ?? "");
}
