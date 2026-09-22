# goemoji

Лёгкий эмодзи-пикер для React: вкладки категорий как в Discord, поиск по названиям
и тегам, тона кожи и **серверные эмодзи** (вкладка «Сервер» + участие в поиске).

- **Лёгкий**: ~5.5 КБ gzip JS + ~1.3 КБ gzip CSS, ноль runtime-зависимостей.
- **Данные рядом**: slim-словари ru/en — 50/38 КБ gzip (против ~108 КБ gzip у сырого
  emojibase-data), без сторонних CDN.
- **Свой рендер**: юникод — системным шрифтом, серверные — картинкой с CDN Discord.
- **Без CSS-хаков**: одна тема на CSS-переменных, никаких `!important` и атрибутных
  селекторов поверх чужих inline-стилей.
- **Доступность**: `combobox` + `listbox`, `aria-activedescendant`, стрелки/Home/End/
  Enter/Esc, подписи из данных.

## Установка

```bash
# напрямую из GitHub по тегу
pnpm add github:VolRencs/goemoji#v0.1.0

# или локально, пока репозитории рядом
pnpm add link:../emoji-picker
```

Пакет publish-ready: `pnpm publish` (или trusted publisher в GitHub Actions) — и можно
ставить из npm.

## Быстрый старт

```tsx
import { EmojiPicker, useEmojiData, type Emoji } from "goemoji";
import "goemoji/styles.css";

export function ReactionPicker() {
  const [value, setValue] = useState("");
  const { data, error } = useEmojiData(() => import("goemoji/data/ru.json"));

  if (error) return <p>Не удалось загрузить эмодзи: {error.message}</p>;
  if (!data) return <p>Загружаем эмодзи…</p>;

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

`onSelect` отдаёт `{ value, label, server }`: для юникода `value` = `"😀"`, для
серверного — `"<a:name:id>"`, то есть готовую строку для Discord API и БД.

Данные можно и просто импортировать статически:

```ts
import ru from "goemoji/data/ru.json";
import { parseEmojiData } from "goemoji";
const data = parseEmojiData(ru); // принимает и namespace модуля
```

## API

### `EmojiPicker`

| Проп | Тип | Описание |
| --- | --- | --- |
| `data` | `EmojiData` | Обязательный разобранный словарь |
| `serverEmojis` | `ServerEmoji[]` | Серверные эмодзи гильдии |
| `columns` | `number` | Колонок в сетке (по умолчанию 8) |
| `cellSize` | `number` | Сторона ячейки в px (по умолчанию 34) |
| `locale` | `string` | Локаль UI, `ru` или `en` (по умолчанию `ru`) |
| `labels` | `Partial<Labels>` | Переопределение строк UI |
| `skinTone` / `onSkinToneChange` | `SkinTone` | Контролируемый тон; без пропа хранится в localStorage |
| `recentKey` | `string \| false` | Ключ localStorage для «Недавних», `false` — выключить |
| `serverIconUrl` | `string` | Иконка сервера для вкладки |
| `onSelect` | `(emoji) => void` | Выбор эмодзи |
| `onEscape` | `() => void` | Esc (удобно закрывать поповер) |
| `className` | `string` | Дополнительный класс на корень |

### `goemoji/discord`

React-free помощники — можно импортировать в Node (бот, API-роуты):

```ts
import { parseCustomEmoji, customEmojiToString, customEmojiUrl, sameEmojiValue } from "goemoji/discord";
```

### Утилиты

`parseEmojiData`, `searchEmojis`, `serverEmojiToEmoji`, `skinToneVariation`,
`stripSkinTone`, `supportsSkinTone`, `buildLayout`, `visibleRange`, `moveActive`,
`SKIN_TONES`, `SERVER_CATEGORY` — всё чистое и покрыто тестами.

## Данные

`data/ru.json` и `data/en.json` генерируются из `emojibase-data`:

```bash
pnpm data   # emojibase-data → data/*.json
```

Формат (v1):

```json
{ "v": 1, "locale": "ru",
  "categories": [{ "key": "smileys-emotion", "label": "Смайлики и люди" }],
  "emojis": [["😀", "улыбающееся лицо", "улыбка смех", 0]] }
```

Тона кожи в данные не кладём: варианты генерируются на лету и сверены с emojibase
(1650+ совпадений, ноль расхождений — `test/skins.test.ts`).

## Стилизация

Тема — CSS-переменные на `.ge-root`: `--ge-bg`, `--ge-panel`, `--ge-text`,
`--ge-muted`, `--ge-accent`, `--ge-hover`, `--ge-active`, `--ge-radius`,
`--ge-list-height`, `--ge-font`, `--ge-font-emoji`.

## Разработка

```bash
pnpm check   # tsc --noEmit
pnpm test    # node --test (чистая логика + golden-тест скинов)
pnpm build   # tsup → dist
pnpm size    # бюджет размера (JS ≤ 9 КБ gzip, данные ≤ 55/45 КБ gzip)
pnpm dev     # песочница на Vite (demo/, не публикуется)
```

## Лицензии

MIT для кода. Данные — [emojibase](https://github.com/milesj/emojibase) (MIT) и
аннотации Unicode CLDR (Unicode License v3): см. `THIRD_PARTY_NOTICES.md`.
