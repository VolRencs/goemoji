# goemoji

An emoji picker for React 19 with category tabs, search by name and tags, skin
tones, recents, and Discord server emoji. The only dependency is `react` (a peer
dependency). The `ru`/`en` dictionaries ship inside the package, so nothing is
fetched from a third-party CDN at runtime.

The build is about 6.2 KB gzip of JavaScript and 1.2 KB gzip of CSS. The
dictionaries are 50.2 KB gzip (`ru`) and 38.1 KB gzip (`en`) and are loaded
lazily, so they never end up in the initial bundle.

## Features

- 1914 emoji per locale across 9 categories, with tabs and sticky section headers.
- Search over localized names and tags, with exact matches ranked first. Server
  emoji are searchable alongside Unicode and get their own section.
- Skin tones: one base glyph plus five modifiers. Variants are generated at
  runtime instead of being stored, and are checked against emojibase in the test
  suite (1650+ comparisons, no mismatches).
- Recents: up to 24 emoji in `localStorage`, with a configurable key (for
  example, one per Discord guild).
- Server emoji rendered as images, searchable, with an optional guild icon on
  the tab.
- A row-virtualized list: while scrolling, React re-renders only the changed
  window, and tab switches are instant.
- Keyboard navigation and ARIA markup for `combobox`, `listbox`, `tablist`, and
  `menu`.
- SSR-friendly: components carry `"use client"`, and data is loaded on the
  client through `useEmojiData`.

## Install

```bash
npm install goemoji
pnpm add goemoji
yarn add goemoji
bun add goemoji
```

Requires React 19 or newer and a bundler that understands `exports` (Vite,
Next.js, webpack 5+, Rollup). The package is ESM-only and ships its own type
declarations.

Install straight from the repository by tag:

```bash
pnpm add github:VolRencs/goemoji#v0.3.0
```

## Quick start

```tsx
import { useState } from "react";
import { EmojiPicker, useEmojiData, type Emoji, type ServerEmoji } from "goemoji";
import "goemoji/styles.css";

const serverEmojis: ServerEmoji[] = [
  { id: "100000000000000001", name: "party_parrot", animated: false },
  { id: "100000000000000002", name: "cat_jam", animated: true },
];

export function ReactionPicker() {
  const [picked, setPicked] = useState("");
  const { data, error, loading } = useEmojiData(() => import("goemoji/data/ru.json"));

  if (error) return <p>Could not load emoji: {error.message}</p>;
  if (loading || !data) return <p>Loading emoji…</p>;

  return (
    <EmojiPicker
      data={data}
      serverEmojis={serverEmojis}
      recentKey="guild:123"
      onSelect={(emoji: Emoji) => setPicked(emoji.value)}
    />
  );
}
```

`onSelect` receives an `Emoji`. For Unicode, `value` is the glyph itself
(`"😀"`); for a server emoji it is a ready-to-store Discord value
(`"<:name:id>"`, or `"<a:name:id>"` when animated).

If the dictionary is known ahead of time, import it statically:

```ts
import ru from "goemoji/data/ru.json";
import { parseEmojiData } from "goemoji";

const data = parseEmojiData(ru);
```

`parseEmojiData` accepts both the JSON object itself and the namespace object
(`{ default: … }`) returned by `import()`.

## Data

`data/ru.json` and `data/en.json` are generated from
[`emojibase-data`](https://github.com/milesj/emojibase) by
`scripts/build-data.ts` and shipped with the package. The format (v1) is:

```json
{
  "v": 1,
  "locale": "ru",
  "categories": [{ "key": "smileys-emotion", "label": "Смайлики и люди" }],
  "emojis": [["😀", "улыбающееся лицо", "улыбка смех", 0]]
}
```

Each emoji row is `[emoji, label, space-separated tags, category index]`.
Skin-tone components (the `component` group) and standalone regional indicators
are excluded; full flags remain. Skin-tone variants are produced at runtime by
`skinToneVariation`.

You can build a custom dictionary in the same format and pass it to
`parseEmojiData`; the component does not require data to come from this package.

## API

### `EmojiPicker`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `EmojiData` | — | Parsed dictionary: `parseEmojiData(...)` or the result of `useEmojiData` |
| `serverEmojis` | `readonly ServerEmoji[]` | — | Server emoji: their own tab and search entries |
| `columns` | `number` | `8` | Grid columns; minimum 1, `NaN` falls back to the default |
| `cellSize` | `number` | `34` | Cell size in pixels; minimum 1, `NaN` falls back to the default |
| `locale` | `string` | `"ru"` | Built-in label locale: `ru` or `en` |
| `labels` | `Partial<Labels>` | — | Overrides for individual UI strings |
| `skinTone` | `SkinTone` | — | Controlled tone; when omitted, the tone is kept in `localStorage` |
| `onSkinToneChange` | `(tone: SkinTone) => void` | — | Called when the tone changes |
| `recentKey` | `string \| false` | `"goemoji:recent"` | `localStorage` key for recents; `false` disables them |
| `onSelect` | `(emoji: Emoji) => void` | — | Required selection handler |
| `onEscape` | `() => void` | — | Called on Escape once the tone menu is closed |
| `serverIconUrl` | `string` | — | Image used on the server tab instead of the default icon |
| `className` | `string` | — | Extra class on the root `.ge-root` element |

The selected tone is stored under the `goemoji:tone` `localStorage` key unless
`skinTone` is passed. `SkinTone` is one of `"none"`, `"light"`,
`"medium-light"`, `"medium"`, `"medium-dark"`, `"dark"`.

### `useEmojiData`

```ts
const { data, error, loading } = useEmojiData(load, deps?);
```

Loads a dictionary and parses it with `parseEmojiData`. The loader runs on mount
and again whenever `deps` change; an in-flight request is ignored, and data is
reset to `null` until the new one resolves. Effects do not run during SSR, so
`loading` stays `true` there.

### Types

| Type | Fields |
| --- | --- |
| `Emoji` | `value: string`, `label: string`, `tags: string`, `category: number`, `server?: { id: string; animated: boolean }` |
| `ServerEmoji` | `id: string`, `name: string`, `animated: boolean` |
| `EmojiData` | `locale: string`, `categories: Category[]`, `emojis: Emoji[]` |
| `Category` | `key: string`, `label: string` |
| `SlimEmoji` | `[emoji, label, tags, category]` — a raw dictionary row |
| `Labels` | `search`, `empty`, `recent`, `server`, `skinTone`, `skinTones` |

All types, including `EmojiPickerProps`, are exported from the package root.

### `goemoji/discord`

A React-free entry point for bots, API routes, and reaction handling.

| Function | Description |
| --- | --- |
| `parseCustomEmoji(value)` | Parses `<:name:id>` / `<a:name:id>`; returns `null` for Unicode |
| `customEmojiToString({ name, id, animated? })` | Builds `<a:name:id>` / `<:name:id>` |
| `customEmojiUrl(id, animated?, size?)` | Discord CDN URL; `size` is clamped to 16–4096 and defaults to 48 |
| `normalizeEmojiText(value)` | Strips U+FE0E/U+FE0F variation selectors and ZWJ |
| `sameEmojiValue(saved, name, identifier)` | Matches a stored value against a reaction: custom emoji by id, Unicode by normalized text |

```ts
import { sameEmojiValue } from "goemoji/discord";

sameEmojiValue("<a:blob:777>", "blob", "blob:777"); // true
sameEmojiValue("❤️", "❤", "❤"); // true
```

## Keyboard

| Key | Action |
| --- | --- |
| `←` / `→` | Previous or next emoji; wraps to the adjacent row at the edge |
| `↑` / `↓` | Row above or below, keeping the column where possible |
| `PageUp` / `PageDown` | Five rows up or down |
| `Home` / `End` | First or last emoji in the list |
| `Enter` | Select the active emoji |
| `Esc` | Close the tone menu, then call `onEscape` |

Focus stays in the search field; the list is linked to it through
`aria-activedescendant`, following the combobox pattern. While the tone menu is
open, arrows, `Home`, `End`, and `Esc` control the menu rather than the list.

## Styling

The theme is driven by CSS variables on `.ge-root` (or any ancestor). No
`!important` is used:

| Variable | Default | Purpose |
| --- | --- | --- |
| `--ge-bg` | `#1e1f22` | Picker background |
| `--ge-panel` | `#2b2d31` | Search field and buttons |
| `--ge-surface` | `#232428` | Tone popover |
| `--ge-border` | `#1a1b1e` | Borders |
| `--ge-text` | `#dbdee1` | Primary text |
| `--ge-muted` | `#949ba4` | Captions and section headers |
| `--ge-hover` | `rgba(255, 255, 255, 0.06)` | Hover state |
| `--ge-active` | `rgba(88, 101, 242, 0.4)` | Active cell |
| `--ge-accent` | `#5865f2` | Accent, focus ring, active tab |
| `--ge-radius` | `6px` | Corner radius |
| `--ge-list-height` | `320px` | List height |
| `--ge-font` | system stack | UI font |
| `--ge-font-emoji` | system emoji stack | Unicode emoji font |

```css
.my-picker {
  --ge-accent: #f2a65a;
  --ge-list-height: 420px;
}
```

Every element uses a `ge-` prefixed class (`ge-root`, `ge-search`, `ge-list`,
`ge-cell`, `ge-tabs`, and so on), so targeted overrides are possible too, but
the variables cover most cases.

## Accessibility

- The search field is a `combobox` with `aria-controls` and
  `aria-activedescendant`; the list is a `listbox`, and cells are `option`
  elements with `aria-selected`.
- Category tabs use `tablist`/`tab` with `aria-selected`.
- The tone menu uses `menu`/`menuitemradio` with `aria-checked`; focus returns
  to the button on selection or close. Navigation supports arrows, `Home`,
  `End`, and `Esc`.
- Clicking outside the popover closes it without stealing focus.
- The section-scroll animation is disabled under
  `prefers-reduced-motion: reduce`.
- Built-in labels are provided for `ru` and `en`; pass `labels` for anything
  else.

## Performance

The list renders row by row: only the rows inside the virtualization window,
plus a small overscan, exist in the DOM. On scroll the range is recomputed in a
`requestAnimationFrame` callback, and React receives new state only when the
window actually moves. Section headers stick to the top edge, and clicking a tab
highlights it immediately and glides to the section with a short animation.

Search runs over the in-memory emoji array (1914 entries per locale), so results
update on every keystroke without debouncing.

## License

Code is MIT. Emoji names and tags come from
[emojibase](https://github.com/milesj/emojibase) (MIT) and the Unicode CLDR
annotations (Unicode License v3); see `THIRD_PARTY_NOTICES.md` for details.
