import type { SkinTone } from "./data.ts";

export type Labels = {
  /** Подсказка в поле поиска. */
  search: string;
  /** Пустая выдача. */
  empty: string;
  /** Заголовок секции недавних. */
  recent: string;
  /** Заголовок секции серверных эмодзи. */
  server: string;
  /** Подпись кнопки тона кожи. */
  skinTone: string;
  /** Названия тонов. */
  skinTones: Record<Exclude<SkinTone, "none">, string>;
};

const RU: Labels = {
  search: "Поиск эмодзи",
  empty: "Ничего не найдено",
  recent: "Недавние",
  server: "Сервер",
  skinTone: "Тон эмодзи",
  skinTones: {
    light: "Светлый тон",
    "medium-light": "Средне-светлый тон",
    medium: "Средний тон",
    "medium-dark": "Средне-тёмный тон",
    dark: "Тёмный тон",
  },
};

const EN: Labels = {
  search: "Search emoji",
  empty: "No emoji found",
  recent: "Recent",
  server: "Server",
  skinTone: "Emoji skin tone",
  skinTones: {
    light: "Light skin tone",
    "medium-light": "Medium-light skin tone",
    medium: "Medium skin tone",
    "medium-dark": "Medium-dark skin tone",
    dark: "Dark skin tone",
  },
};

export function labelsFor(locale: string): Labels {
  return locale.toLowerCase().startsWith("ru") ? RU : EN;
}

const CATEGORY_ICONS: Record<string, string> = {
  "smileys-emotion": "😀",
  "people-body": "🧑",
  "animals-nature": "🐻",
  "food-drink": "🍔",
  "travel-places": "🚗",
  activities: "⚽",
  objects: "💡",
  symbols: "🔣",
  flags: "🏳️",
};

/** Иконка вкладки категории (по ключу группы emojibase). */
export function categoryIcon(key: string): string {
  return CATEGORY_ICONS[key] ?? "•";
}

/** Иконка вкладки серверных эмодзи, если потребитель не дал картинку сервера. */
export const SERVER_TAB_ICON = "🧩";

export const RECENT_TAB_ICON = "🕘";

/** Шаг сетки между ячейками; JS и CSS берут его отсюда. */
export const GRID_GAP = 2;

/** Базовый эмодзи для кнопки тона кожи (Discord использует поднятую руку). */
export const SKIN_TONE_BASE = "✋";
