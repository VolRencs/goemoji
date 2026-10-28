export type CustomEmoji = { id: string; name: string; animated: boolean };

const CUSTOM_EMOJI = /^<(a?):([\w~]+):(\d+)>$/;

export function parseCustomEmoji(value: string): CustomEmoji | null {
  const match = CUSTOM_EMOJI.exec(value);
  if (!match) return null;
  return { name: match[2]!, id: match[3]!, animated: match[1] === "a" };
}

export function customEmojiToString(emoji: Omit<CustomEmoji, "animated"> & { animated?: boolean }): string {
  return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}

export type DiscordComponentEmoji =
  | { id: string; name: string; animated: boolean }
  | { name: string };

export function stripVariationSelectors(value: string): string {
  return value.replace(/[\uFE0E\uFE0F]/gu, "");
}

export function toDiscordEmoji(value: string | null | undefined): DiscordComponentEmoji | undefined {
  if (!value) return undefined;
  return parseCustomEmoji(value) ?? { name: stripVariationSelectors(value) };
}

export function toDiscordReaction(value: string): string {
  const custom = parseCustomEmoji(value);
  return custom ? `${custom.name}:${custom.id}` : stripVariationSelectors(value);
}

export function customEmojiUrl(id: string, animated = false, size = 64): string {
  // Discord accepts only powers of two between 16 and 4096.
  const requested = Number.isFinite(size) ? Math.min(4096, Math.max(16, Math.trunc(size))) : 64;
  const pixels = 2 ** Math.round(Math.log2(requested));
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=${pixels}`;
}

export function normalizeEmojiText(value: string): string {
  return stripVariationSelectors(value).replace(/\u200D/gu, "");
}

export function sameEmojiValue(saved: string, name: string | null, identifier: string): boolean {
  const custom = parseCustomEmoji(saved);
  if (custom) return identifier.endsWith(`:${custom.id}`);
  return normalizeEmojiText(saved) === normalizeEmojiText(name ?? "");
}
