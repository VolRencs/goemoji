/**
 * Чистая логика пикера: разбор slim-словаря, поиск, тона кожи, раскладка
 * и виртуализация. Здесь нет React — всё покрыто тестами в `test/`.
 */

/* ------------------------------------------------------------------ типы */

export type SkinTone =
  | "none"
  | "light"
  | "medium-light"
  | "medium"
  | "medium-dark"
  | "dark";

/** Тона без `none`, от светлого к тёмному — совпадает с `tone` 1..5 в emojibase. */
export const SKIN_TONES = [
  "light",
  "medium-light",
  "medium",
  "medium-dark",
  "dark",
] as const satisfies readonly Exclude<SkinTone, "none">[];

export const SKIN_TONE_MODIFIERS: Record<Exclude<SkinTone, "none">, string> = {
  light: "\u{1F3FB}",
  "medium-light": "\u{1F3FC}",
  medium: "\u{1F3FD}",
  "medium-dark": "\u{1F3FE}",
  dark: "\u{1F3FF}",
};

export type Category = { key: string; label: string };

/** Строка slim-словаря: `[эмодзи, название, теги через пробел, индекс категории]`. */
export type SlimEmoji = [string, string, string, number];

export type ServerEmoji = { id: string; name: string; animated: boolean };

export type Emoji = {
  /** Готовое значение: `"😀"` или `"<a:name:id>"`. */
  value: string;
  label: string;
  /** Теги через пробел — только для поиска. */
  tags: string;
  category: number;
  /** Заполнено у серверных эмодзи: рендерятся картинкой, а не глифом. */
  server?: { id: string; animated: boolean };
};

export type EmojiData = {
  locale: string;
  categories: Category[];
  emojis: Emoji[];
};

export const SERVER_CATEGORY = -1;

/* --------------------------------------------------------------- разбор */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Разворачивает namespace JSON-модуля (`{ default: … }`) — так его отдаёт `import("…/ru.json")`. */
function unwrapDefault(raw: unknown): unknown {
  if (isRecord(raw) && raw.v === undefined && "default" in raw) {
    const inner = raw.default;
    if (isRecord(inner) && inner.v === 1) return inner;
  }
  return raw;
}

/**
 * Разбирает и валидирует slim-словарь (см. `scripts/build-data.ts`).
 * Бросает с понятным текстом — битые данные лучше увидеть сразу.
 *
 * Принимает как сам объект данных, так и модуль: `parseEmojiData(await import("…/ru.json"))`.
 */
export function parseEmojiData(input: unknown): EmojiData {
  const raw = unwrapDefault(input);
  if (!isRecord(raw) || raw.v !== 1) {
    throw new Error("goemoji: неизвестный формат данных (ожидается v: 1)");
  }
  if (!Array.isArray(raw.categories) || !Array.isArray(raw.emojis)) {
    throw new Error("goemoji: в данных нет categories/emojis");
  }

  const categories: Category[] = raw.categories.map((item, index) => {
    if (!isRecord(item) || typeof item.key !== "string" || typeof item.label !== "string") {
      throw new Error(`goemoji: категория #${index} повреждена`);
    }
    return { key: item.key, label: item.label };
  });

  const emojis: Emoji[] = raw.emojis.map((item, index) => {
    if (
      !Array.isArray(item) ||
      typeof item[0] !== "string" ||
      typeof item[1] !== "string" ||
      typeof item[2] !== "string" ||
      typeof item[3] !== "number"
    ) {
      throw new Error(`goemoji: эмодзи #${index} повреждён`);
    }
    const category = item[3];
    if (category < 0 || category >= categories.length) {
      throw new Error(`goemoji: эмодзи #${index} ссылается на неизвестную категорию`);
    }
    if (!item[0]) {
      throw new Error(`goemoji: эмодзи #${index} пустой`);
    }
    return { value: item[0], label: item[1], tags: item[2], category };
  });

  return { locale: typeof raw.locale === "string" ? raw.locale : "en", categories, emojis };
}

/** Превращает серверный эмодзи в общий вид (значение — `<a:name:id>`). */
export function serverEmojiToEmoji(server: ServerEmoji): Emoji {
  const { id, name, animated } = server;
  return {
    value: `<${animated ? "a" : ""}:${name}:${id}>`,
    label: name,
    tags: `${name.replace(/[_-]+/g, " ")} ${name}`.toLowerCase(),
    category: SERVER_CATEGORY,
    server: { id, animated },
  };
}

/* ------------------------------------------------------------ тона кожи */

const ZWJ = "\u200D";
const MODIFIER_BASE = /\p{Emoji_Modifier_Base}/u;
const TRAILING_VS16 = /\uFE0F$/;
const TONE_MODIFIER = /\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF}/gu;

/** Поддерживает ли эмодзи тона кожи (есть сегмент-модификатор). */
export function supportsSkinTone(emoji: string): boolean {
  return emoji.split(ZWJ).some((segment) => MODIFIER_BASE.test(segment));
}

/** Убирает модификатор тона из эмодзи. */
export function stripSkinTone(emoji: string): string {
  return emoji
    .split(ZWJ)
    .map((segment) => segment.replace(TONE_MODIFIER, ""))
    .join(ZWJ);
}

/**
 * Вариант эмодзи с выбранным тоном. Алгоритм сверен с данными emojibase
 * (test/skins.test.ts): 👋 + light = 👋🏻, 🤝 в ZWJ-последовательности тон не получает.
 */
export function skinToneVariation(emoji: string, tone: SkinTone): string {
  const base = stripSkinTone(emoji);
  if (tone === "none" || !supportsSkinTone(base)) {
    return base;
  }
  const modifier = SKIN_TONE_MODIFIERS[tone];
  return base
    .split(ZWJ)
    .map((segment, _index, segments) => {
      if (!MODIFIER_BASE.test(segment) || (segments.length > 1 && segment === "🤝")) {
        return segment;
      }
      return segment.replace(TRAILING_VS16, "") + modifier;
    })
    .join(ZWJ);
}

/* --------------------------------------------------------------- поиск */

function scoreEmoji(emoji: Emoji, needle: string): number {
  const label = emoji.label.toLowerCase();
  if (label === needle) return 100;
  if (label.startsWith(needle)) return 60;
  if (label.includes(needle)) return 40;

  for (const tag of emoji.tags.split(" ")) {
    if (!tag) continue;
    if (tag === needle) return 25;
    if (tag.startsWith(needle)) return 15;
    if (tag.includes(needle)) return 8;
  }
  return 0;
}

/**
 * Поиск по названию и тегам. Совпадение в названии весит больше, чем в теге;
 * порядок при равных весах сохраняется (сортировка стабильна).
 */
export function searchEmojis(emojis: readonly Emoji[], query: string): Emoji[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...emojis];

  const found: { emoji: Emoji; score: number }[] = [];
  for (const emoji of emojis) {
    const score = scoreEmoji(emoji, needle);
    if (score > 0) found.push({ emoji, score });
  }
  found.sort((a, b) => b.score - a.score);
  return found.map((item) => item.emoji);
}

/* ------------------------------------------------------ раскладка/скролл */

export type Section = {
  /** Заголовок секции; без него секция рисуется без шапки. */
  label?: string;
  emojis: readonly Emoji[];
};

export type LayoutRow =
  | { kind: "header"; label: string; section: number }
  | { kind: "emojis"; section: number; emojis: readonly Emoji[]; start: number };

export type Layout = {
  rows: LayoutRow[];
  /** y-координата каждой строки от начала списка. */
  offsets: number[];
  /** Индекс первой строки секции; `-1` у пустых секций. */
  sectionRows: number[];
  rowHeight: number;
  headerHeight: number;
  totalHeight: number;
};

/**
 * Раскладывает секции в виртуализируемые строки. Секции без эмодзи
 * игнорируются — вызывающий обычно отфильтровывает их заранее.
 */
export function buildLayout(
  sections: readonly Section[],
  columns: number,
  rowHeight: number,
  headerHeight: number,
): Layout {
  const rows: LayoutRow[] = [];
  const offsets: number[] = [];
  const sectionRows: number[] = [];
  let y = 0;
  let flat = 0;

  sections.forEach((section, sectionIndex) => {
    if (section.emojis.length === 0) {
      sectionRows[sectionIndex] = -1;
      return;
    }
    sectionRows[sectionIndex] = rows.length;
    if (section.label !== undefined) {
      rows.push({ kind: "header", label: section.label, section: sectionIndex });
      offsets.push(y);
      y += headerHeight;
    }
    for (let start = 0; start < section.emojis.length; start += columns) {
      const emojis = section.emojis.slice(start, start + columns);
      rows.push({
        kind: "emojis",
        section: sectionIndex,
        emojis,
        start: flat,
      });
      offsets.push(y);
      y += rowHeight;
      flat += emojis.length;
    }
  });

  return {
    rows,
    offsets,
    sectionRows,
    rowHeight,
    headerHeight,
    totalHeight: y,
  };
}

function rowHeight(layout: Layout, row: number): number {
  return layout.rows[row]?.kind === "header" ? layout.headerHeight : layout.rowHeight;
}

/** Индекс первой и последней видимой строки с запасом `overscan` строк. */
export function visibleRange(
  layout: Layout,
  scrollTop: number,
  viewportHeight: number,
  overscan = 2,
): [start: number, end: number] {
  const margin = overscan * layout.rowHeight;
  const from = scrollTop - margin;
  const to = scrollTop + viewportHeight + margin;

  let start = 0;
  while (start < layout.rows.length && layout.offsets[start]! + rowHeight(layout, start) < from) {
    start++;
  }
  let end = start;
  while (end < layout.rows.length && layout.offsets[end]! <= to) {
    end++;
  }
  return [start, end];
}

/** Индекс секции, которая сейчас вверху списка (`-1`, если список пуст).
 *  У нижней границы (когда `scrollTop` упёрся в конец) подсвечивается
 *  последняя непустая секция — иначе короткая секция в конце списка
 *  никогда не стала бы активной. */
export function sectionAt(
  layout: Layout,
  scrollTop: number,
  maxScroll = Number.POSITIVE_INFINITY,
): number {
  if (scrollTop >= maxScroll - 1 && maxScroll > 0) {
    for (let index = layout.sectionRows.length - 1; index >= 0; index--) {
      if ((layout.sectionRows[index] ?? -1) >= 0) return index;
    }
  }

  let current = -1;
  for (let index = 0; index < layout.sectionRows.length; index++) {
    const row = layout.sectionRows[index]!;
    if (row < 0) continue;
    if (layout.offsets[row]! <= scrollTop + 1) current = index;
    else break;
  }
  return current;
}

/** y-координата начала секции (для клика по вкладке). */
export function sectionOffset(layout: Layout, section: number): number {
  const row = layout.sectionRows[section];
  return row === undefined || row < 0 ? 0 : layout.offsets[row]!;
}

export type Cell = { row: number; col: number };

/** Плоский индекс эмодзи (для id в DOM) или `-1` для строки-заголовка. */
export function flatIndexAt(layout: Layout, cell: Cell): number {
  const row = layout.rows[cell.row];
  return row?.kind === "emojis" ? row.start + cell.col : -1;
}

function clampCol(layout: Layout, row: number, col: number): number {
  const layoutRow = layout.rows[row];
  if (layoutRow?.kind !== "emojis") return 0;
  return Math.max(0, Math.min(col, layoutRow.emojis.length - 1));
}

/** Ближайшая строка с эмодзи в заданном направлении (заголовки перепрыгиваем). */
function adjacentEmojiRow(layout: Layout, row: number, direction: number): number | null {
  for (let next = row + direction; next >= 0 && next < layout.rows.length; next += direction) {
    if (layout.rows[next]?.kind === "emojis") return next;
  }
  return null;
}

/** Эмодзи в ячейке или `null`, если строка — заголовок. */
export function emojiAt(layout: Layout, cell: Cell): Emoji | null {
  const row = layout.rows[cell.row];
  if (row?.kind !== "emojis") return null;
  return row.emojis[cell.col] ?? null;
}

export function firstCell(layout: Layout): Cell | null {
  const row = adjacentEmojiRow(layout, -1, 1);
  return row === null ? null : { row, col: 0 };
}

export function lastCell(layout: Layout): Cell | null {
  const row = adjacentEmojiRow(layout, layout.rows.length, -1);
  return row === null ? null : { row, col: clampCol(layout, row, Number.MAX_SAFE_INTEGER) };
}

/** Сдвиг активной ячейки; на границах списка остаётся на месте. */
export function moveActive(layout: Layout, active: Cell, dx: number, dy: number): Cell {
  if (dy !== 0) {
    let row = active.row;
    for (let step = 0; step < Math.abs(dy); step++) {
      const next = adjacentEmojiRow(layout, row, Math.sign(dy));
      if (next === null) break;
      row = next;
    }
    return { row, col: clampCol(layout, row, active.col) };
  }
  if (dx === 0) return active;

  const row = layout.rows[active.row];
  if (row?.kind !== "emojis") return active;

  const next = active.col + dx;
  if (next >= 0 && next < row.emojis.length) {
    return { row: active.row, col: next };
  }
  const adjacent = adjacentEmojiRow(layout, active.row, Math.sign(dx));
  if (adjacent === null) return active;
  return { row: adjacent, col: dx > 0 ? 0 : clampCol(layout, adjacent, Number.MAX_SAFE_INTEGER) };
}

/** Новый scrollTop, при котором строка целиком видна (учитывая липкую шапку). */
export function scrollToShowRow(
  layout: Layout,
  row: number,
  scrollTop: number,
  viewportHeight: number,
  stickyHeight = 0,
): number {
  const top = layout.offsets[row];
  if (top === undefined) return scrollTop;
  const bottom = top + rowHeight(layout, row);
  if (top - stickyHeight < scrollTop) return Math.max(0, top - stickyHeight);
  if (bottom > scrollTop + viewportHeight) return Math.max(0, bottom - viewportHeight);
  return scrollTop;
}
