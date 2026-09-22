"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  buildLayout,
  emojiAt,
  firstCell,
  flatIndexAt,
  lastCell,
  moveActive,
  scrollToShowRow,
  searchEmojis,
  sectionAt,
  sectionOffset,
  serverEmojiToEmoji,
  skinToneVariation,
  SKIN_TONES,
  visibleRange,
  type Cell,
  type Emoji,
  type EmojiData,
  type Section,
  type ServerEmoji,
  type SkinTone,
} from "./data.ts";
import { EmojiList } from "./EmojiList.tsx";
import {
  GRID_GAP,
  RECENT_TAB_ICON,
  SERVER_TAB_ICON,
  SKIN_TONE_BASE,
  categoryIcon,
  labelsFor,
  type Labels,
} from "./labels.ts";

const TONE_STORAGE_KEY = "goemoji:tone";
const DEFAULT_RECENT_KEY = "goemoji:recent";
const DEFAULT_COLUMNS = 8;
const DEFAULT_CELL_SIZE = 34;
const HEADER_HEIGHT = 26;
const MAX_RECENT = 24;
const PAGE_ROWS = 5;

type TabMeta = { icon: string; title: string; img?: string | undefined };

export type EmojiPickerProps = {
  /** Разобранный словарь: `parseEmojiData(ruJson)` или `useEmojiData(...)`. */
  data: EmojiData;
  /** Серверные эмодзи гильдии — вкладка «Сервер» и участие в поиске. */
  serverEmojis?: readonly ServerEmoji[] | undefined;
  /** Колонок в сетке. */
  columns?: number | undefined;
  /** Сторона ячейки в пикселях. */
  cellSize?: number | undefined;
  /** Локаль UI (`ru`/`en`), по умолчанию `ru`. */
  locale?: string | undefined;
  /** Переопределение отдельных строк UI. */
  labels?: Partial<Labels> | undefined;
  /** Контролируемый тон кожи; без него храним последний в localStorage. */
  skinTone?: SkinTone | undefined;
  onSkinToneChange?: ((tone: SkinTone) => void) | undefined;
  /** Ключ localStorage для недавних; `false` — отключить. */
  recentKey?: string | false | undefined;
  onSelect: (emoji: Emoji) => void;
  onEscape?: (() => void) | undefined;
  /** Иконка сервера для вкладки «Сервер». */
  serverIconUrl?: string | undefined;
  className?: string | undefined;
};

export function EmojiPicker({
  data,
  serverEmojis,
  columns = DEFAULT_COLUMNS,
  cellSize = DEFAULT_CELL_SIZE,
  locale = "ru",
  labels: labelOverrides,
  skinTone,
  onSkinToneChange,
  recentKey = DEFAULT_RECENT_KEY,
  onSelect,
  onEscape,
  serverIconUrl,
  className,
}: EmojiPickerProps) {
  const labels = useMemo<Labels>(
    () => ({ ...labelsFor(locale), ...labelOverrides }),
    [locale, labelOverrides],
  );

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Cell | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(320);
  const [toneOpen, setToneOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() =>
    recentKey === false ? [] : readRecent(recentKey),
  );
  const [internalTone, setInternalTone] = useState<SkinTone>(readTone);
  const tone = skinTone ?? internalTone;

  const generatedId = useId().replace(/[^\w-]/g, "");
  const listId = `ge-list-${generatedId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  const serverEntries = useMemo(
    () => (serverEmojis ?? []).map(serverEmojiToEmoji),
    [serverEmojis],
  );
  const merged = useMemo(
    () => [...data.emojis, ...serverEntries],
    [data.emojis, serverEntries],
  );
  const emojiByValue = useMemo(
    () => new Map(merged.map((emoji) => [emoji.value, emoji])),
    [merged],
  );
  const recentEmojis = useMemo(
    () =>
      recent
        .map((value) => emojiByValue.get(value))
        .filter((emoji): emoji is Emoji => emoji !== undefined),
    [recent, emojiByValue],
  );

  const { sections, tabs } = useMemo(() => {
    const needle = query.trim();
    if (needle) {
      const hits = searchEmojis(merged, needle);
      const server = hits.filter((emoji) => emoji.server);
      const unicode = hits.filter((emoji) => !emoji.server);
      return {
        sections: [
          { emojis: unicode },
          ...(server.length ? [{ label: labels.server, emojis: server }] : []),
        ] as Section[],
        tabs: [] as TabMeta[],
      };
    }

    const byCategory = new Map<number, Emoji[]>();
    for (const emoji of data.emojis) {
      const list = byCategory.get(emoji.category);
      if (list) list.push(emoji);
      else byCategory.set(emoji.category, [emoji]);
    }

    const nextSections: Section[] = [];
    const nextTabs: TabMeta[] = [];
    if (recentEmojis.length) {
      nextSections.push({ label: labels.recent, emojis: recentEmojis });
      nextTabs.push({ icon: RECENT_TAB_ICON, title: labels.recent });
    }
    data.categories.forEach((category, index) => {
      const list = byCategory.get(index);
      if (!list?.length) return;
      nextSections.push({ label: category.label, emojis: list });
      nextTabs.push({ icon: categoryIcon(category.key), title: category.label });
    });
    if (serverEntries.length) {
      nextSections.push({ label: labels.server, emojis: serverEntries });
      nextTabs.push({
        icon: SERVER_TAB_ICON,
        title: labels.server,
        ...(serverIconUrl ? { img: serverIconUrl } : {}),
      });
    }
    return { sections: nextSections, tabs: nextTabs };
  }, [query, merged, recentEmojis, data.categories, data.emojis, serverEntries, labels, serverIconUrl]);

  const rowHeight = cellSize + GRID_GAP;
  const layout = useMemo(
    () => buildLayout(sections, columns, rowHeight, HEADER_HEIGHT),
    [sections, columns, rowHeight],
  );
  const [start, end] = visibleRange(layout, scrollTop, viewportHeight);

  const searching = query.trim().length > 0;
  const activeSection = searching ? -1 : sectionAt(layout, scrollTop);
  const stickyLabel = useMemo(() => {
    if (activeSection < 0) return null;
    const row = layout.sectionRows[activeSection];
    const label = sections[activeSection]?.label;
    if (row === undefined || row < 0 || label === undefined) return null;
    return (layout.offsets[row] ?? 0) + layout.headerHeight <= scrollTop + 1 ? label : null;
  }, [activeSection, layout, sections, scrollTop]);

  const activeId = active ? `${listId}-${flatIndexAt(layout, active)}` : null;

  const updateScroll = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setScrollTop(scrollRef.current?.scrollTop ?? 0);
    });
  }, []);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () => setViewportHeight(element.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toneOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setToneOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [toneOpen]);

  const scrollTo = useCallback((top: number, smooth = false) => {
    scrollRef.current?.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    setScrollTop(top);
  }, []);

  const select = useCallback(
    (emoji: Emoji) => {
      onSelect(emoji);
      if (recentKey === false) return;
      setRecent((previous) => {
        const next = [emoji.value, ...previous.filter((value) => value !== emoji.value)].slice(
          0,
          MAX_RECENT,
        );
        writeRecent(recentKey, next);
        return next;
      });
    },
    [onSelect, recentKey],
  );

  const changeQuery = useCallback(
    (value: string) => {
      setQuery(value);
      setActive(null);
      scrollTo(0);
    },
    [scrollTo],
  );

  const changeTone = useCallback(
    (next: SkinTone) => {
      setToneOpen(false);
      if (skinTone === undefined) {
        setInternalTone(next);
        writeTone(next);
      }
      onSkinToneChange?.(next);
    },
    [onSkinToneChange, skinTone],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onEscape?.();
      return;
    }
    const current = active ?? firstCell(layout);
    if (!current) return;

    let next: Cell;
    switch (event.key) {
      case "ArrowLeft":
        next = moveActive(layout, current, -1, 0);
        break;
      case "ArrowRight":
        next = moveActive(layout, current, 1, 0);
        break;
      case "ArrowUp":
        next = moveActive(layout, current, 0, -1);
        break;
      case "ArrowDown":
        next = moveActive(layout, current, 0, 1);
        break;
      case "PageUp":
        next = moveActive(layout, current, 0, -PAGE_ROWS);
        break;
      case "PageDown":
        next = moveActive(layout, current, 0, PAGE_ROWS);
        break;
      case "Home":
        next = firstCell(layout) ?? current;
        break;
      case "End":
        next = lastCell(layout) ?? current;
        break;
      case "Enter": {
        const emoji = emojiAt(layout, current);
        if (!emoji) return;
        event.preventDefault();
        select(emoji);
        return;
      }
      default:
        return;
    }

    event.preventDefault();
    setActive(next);
    const from = scrollRef.current?.scrollTop ?? 0;
    const top = scrollToShowRow(layout, next.row, from, viewportHeight, layout.headerHeight);
    if (Math.abs(top - from) > 1) scrollTo(top);
  };

  return (
    <div
      ref={rootRef}
      className={className ? `ge-root ${className}` : "ge-root"}
      style={
        {
          "--ge-cell": `${cellSize}px`,
          "--ge-gap": `${GRID_GAP}px`,
          "--ge-row-height": `${rowHeight}px`,
          "--ge-header-height": `${HEADER_HEIGHT}px`,
          "--ge-columns": columns,
        } as CSSProperties
      }
      onKeyDown={onKeyDown}
    >
      <div className="ge-top">
        <input
          className="ge-search"
          type="text"
          value={query}
          placeholder={labels.search}
          aria-label={labels.search}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={activeId ?? undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          onChange={(event) => changeQuery(event.target.value)}
        />
        <div className="ge-tone-wrap">
          <button
            type="button"
            className="ge-tone"
            title={labels.skinTone}
            aria-label={labels.skinTone}
            aria-expanded={toneOpen}
            onClick={() => setToneOpen((open) => !open)}
          >
            {skinToneVariation(SKIN_TONE_BASE, tone)}
          </button>
          {toneOpen && (
            <div className="ge-tone-pop" role="menu" aria-label={labels.skinTone}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={tone === "none"}
                className="ge-tone-item"
                data-active={tone === "none" ? "" : undefined}
                onClick={() => changeTone("none")}
              >
                {SKIN_TONE_BASE}
              </button>
              {SKIN_TONES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={tone === value}
                  className="ge-tone-item"
                  data-active={tone === value ? "" : undefined}
                  title={labels.skinTones[value]}
                  aria-label={labels.skinTones[value]}
                  onClick={() => changeTone(value)}
                >
                  {skinToneVariation(SKIN_TONE_BASE, value)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="ge-tabs" role="tablist" aria-label={labels.search}>
          {tabs.map((tab, index) => (
            <button
              key={`${tab.title}-${index}`}
              type="button"
              role="tab"
              aria-selected={index === activeSection}
              className="ge-tab"
              data-active={index === activeSection ? "" : undefined}
              title={tab.title}
              onClick={() => scrollTo(sectionOffset(layout, index), true)}
            >
              {tab.img ? <img src={tab.img} alt="" draggable={false} /> : tab.icon}
            </button>
          ))}
        </div>
      )}

      <EmojiList
        layout={layout}
        start={start}
        end={end}
        active={active}
        tone={tone}
        listId={listId}
        label={labels.search}
        emptyLabel={labels.empty}
        stickyLabel={stickyLabel}
        scrollRef={scrollRef}
        onScroll={updateScroll}
        onSelect={select}
        onHover={setActive}
        onLeave={() => setActive(null)}
      />
    </div>
  );
}

function readRecent(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(key: string, values: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* хранилище недоступно или переполнено */
  }
}

function readTone(): SkinTone {
  try {
    const raw = localStorage.getItem(TONE_STORAGE_KEY);
    return raw !== null && isSkinTone(raw) ? raw : "none";
  } catch {
    return "none";
  }
}

function writeTone(tone: SkinTone): void {
  try {
    localStorage.setItem(TONE_STORAGE_KEY, tone);
  } catch {
    /* хранилище недоступно */
  }
}

function isSkinTone(value: string): value is SkinTone {
  return value === "none" || (SKIN_TONES as readonly string[]).includes(value);
}
