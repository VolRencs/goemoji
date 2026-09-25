"use client";

import type { RefObject } from "react";
import { customEmojiUrl } from "./discord.ts";
import { skinToneVariation, type Cell, type Emoji, type Layout, type SkinTone } from "./data.ts";

type EmojiListProps = {
  layout: Layout;
  start: number;
  end: number;
  active: Cell | null;
  tone: SkinTone;
  listId: string;
  label: string;
  emptyLabel: string;
  stickyLabel: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onInterrupt: () => void;
  onSelect: (emoji: Emoji) => void;
  onHover: (cell: Cell) => void;
  onLeave: () => void;
};

export function EmojiList({
  layout,
  start,
  end,
  active,
  tone,
  listId,
  label,
  emptyLabel,
  stickyLabel,
  scrollRef,
  onScroll,
  onInterrupt,
  onSelect,
  onHover,
  onLeave,
}: EmojiListProps) {
  const rows = layout.rows.slice(start, end);
  const windowTop = layout.offsets[start] ?? 0;

  return (
    <div
      className="ge-list"
      id={listId}
      ref={scrollRef}
      role="listbox"
      aria-label={label}
      onScroll={onScroll}
      onWheel={onInterrupt}
      onTouchStart={onInterrupt}
      onPointerDown={onInterrupt}
      onMouseLeave={onLeave}
    >
      <div className="ge-sizer" style={{ height: layout.totalHeight }}>
        <div className="ge-window" style={{ transform: `translateY(${windowTop}px)` }}>
          {rows.map((row, index) => {
            const rowIndex = start + index;
            if (row.kind === "header") {
              return (
                <div className="ge-header" key={`h${rowIndex}`}>
                  {row.label}
                </div>
              );
            }
            return (
              <div className="ge-row" key={`r${rowIndex}`}>
                {row.emojis.map((emoji, col) => (
                  <EmojiCell
                    key={`${row.start + col}`}
                    id={`${listId}-${row.start + col}`}
                    emoji={emoji}
                    tone={tone}
                    active={active?.row === rowIndex && active.col === col}
                    onSelect={onSelect}
                    onHover={onHover}
                    row={rowIndex}
                    col={col}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {layout.rows.length === 0 && <p className="ge-empty">{emptyLabel}</p>}
      {stickyLabel !== null && <div className="ge-sticky">{stickyLabel}</div>}
    </div>
  );
}

type EmojiCellProps = {
  id: string;
  emoji: Emoji;
  tone: SkinTone;
  active: boolean;
  row: number;
  col: number;
  onSelect: (emoji: Emoji) => void;
  onHover: (cell: Cell) => void;
};

function EmojiCell({ id, emoji, tone, active, row, col, onSelect, onHover }: EmojiCellProps) {
  const server = emoji.server;
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      className="ge-cell"
      data-active={active ? "" : undefined}
      title={emoji.label}
      onMouseEnter={() => onHover({ row, col })}
      onClick={() => onSelect(emoji)}
    >
      {server ? (
        <img src={customEmojiUrl(server.id, server.animated)} alt="" loading="lazy" draggable={false} />
      ) : (
        skinToneVariation(emoji.value, tone)
      )}
    </div>
  );
}
