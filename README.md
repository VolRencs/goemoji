# goemoji

A tiny React emoji picker with Discord-style category tabs, search by name and tags,
skin tones and **server (custom) emoji** support — custom emoji get their own tab and
take part in search.

- **Tiny**: ~5.5 KB gzip JS + ~1.3 KB gzip CSS, zero runtime dependencies.
- **Data included**: slim `ru`/`en` dictionaries — 50/38 KB gzip (vs ~108 KB gzip for
  raw emojibase data), no third-party CDN at runtime.
- **Own rendering**: unicode via the system emoji font, custom emoji as images.
- **No CSS hacks**: one theme driven by CSS variables, no `!important` fights.
- **Accessible**: `combobox` + `listbox`, `aria-activedescendant`, arrow/Home/End/Enter/Esc.

See `README.ru.md` for the Russian version.

## Install

```bash
# straight from GitHub by tag
pnpm add github:VolRencs/goemoji#v0.1.0

# or locally, while both repos sit next to each other
pnpm add link:../emoji-picker
```

The package is publish-ready (`pnpm publish`), so npm is a one-liner away.

## Usage

```tsx
import { EmojiPicker, useEmojiData, type Emoji } from "goemoji";
import "goemoji/styles.css";

export function ReactionPicker() {
  const [value, setValue] = useState("");
  const { data, error } = useEmojiData(() => import("goemoji/data/ru.json"));

  if (error) return <p>{error.message}</p>;
  if (!data) return <p>Loading emoji…</p>;

  return (
    <EmojiPicker
      data={data}
      serverEmojis={serverEmojis}          // [{ id, name, animated }]
      recentKey={`guild:${guildId}`}
      onEscape={() => setOpen(false)}
      onSelect={(emoji: Emoji) => setValue(emoji.value)}
    />
  );
}
```

`onSelect` yields `{ value, label, server }`: unicode gives `"😀"`, custom emoji give
`"<a:name:id>"` — a ready-to-store Discord value.

## Docs

- Props / hooks / helpers: `README.ru.md` (API table and data pipeline).
- Data format and regeneration: `pnpm data`.
- Size budget: `pnpm size` (JS ≤ 9 KB gzip, data ≤ 55/45 KB gzip).

## Development

```bash
pnpm check && pnpm test && pnpm build && pnpm size
pnpm dev   # Vite playground in demo/ (not published)
```

## License

MIT for the code. Data comes from [emojibase](https://github.com/milesj/emojibase)
(MIT) and Unicode CLDR annotations (Unicode License v3) — see `THIRD_PARTY_NOTICES.md`.
