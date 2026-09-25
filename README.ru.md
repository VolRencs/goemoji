# goemoji

Пикер эмодзи для React 19: категории с вкладками, поиск по названию и тегам,
тона кожи, «Недавние» и серверные эмодзи Discord. Единственная зависимость —
`react` (peer), словари `ru`/`en` лежат внутри пакета, внешние CDN в рантайме не
нужны.

Размер сборки: около 6.2 КБ gzip JS и 1.2 КБ gzip CSS. Словари занимают
50.2 КБ gzip (`ru`) и 38.1 КБ gzip (`en`), но подключаются лениво, поэтому в
первый бандл не попадают.

## Возможности

- 1914 эмодзи в каждой локали, 9 категорий с вкладками и липкими заголовками.
- Поиск по локализованному названию и тегам с приоритетом точных совпадений;
  серверные эмодзи ищутся вместе с юникодом и получают отдельную секцию.
- Тона кожи: базовый глиф и пять модификаторов. Варианты не хранятся в данных,
  а собираются на лету и сверены с emojibase (1650+ сравнений, расхождений нет).
- «Недавние» — до 24 эмодзи в localStorage; ключ можно задать свой, например
  для каждого сервера Discord.
- Серверные эмодзи рендерятся картинкой, участвуют в поиске и могут иметь
  собственную иконку на вкладке.
- Список виртуализирован по строкам: при скролле React перерисовывает только
  изменившееся окно, вкладки переключаются мгновенно.
- Управление с клавиатуры и ARIA-разметка `combobox`/`listbox`/`tablist`/`menu`.
- SSR-совместимость: компоненты помечены `"use client"`, данные грузятся на
  клиенте через `useEmojiData`.

## Установка

```bash
npm install goemoji
pnpm add goemoji
yarn add goemoji
bun add goemoji
```

Нужен React 19 или новее и сборщик, понимающий `exports` (Vite, Next.js,
webpack 5+, Rollup). Пакет поставляется как ESM вместе с объявлениями типов.

Установка напрямую из репозитория по тегу:

```bash
pnpm add github:VolRencs/goemoji#v0.3.0
```

## Быстрый старт

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

  if (error) return <p>Не удалось загрузить эмодзи: {error.message}</p>;
  if (loading || !data) return <p>Загружаем эмодзи…</p>;

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

`onSelect` получает объект `Emoji`. У юникода поле `value` содержит глиф
(`"😀"`), у серверного эмодзи — готовую строку для Discord API и БД
(`"<:name:id>"` или `"<a:name:id>"` для анимированного).

Если словарь известен заранее, его можно импортировать статически:

```ts
import ru from "goemoji/data/ru.json";
import { parseEmojiData } from "goemoji";

const data = parseEmojiData(ru);
```

`parseEmojiData` принимает как сам JSON-объект, так и namespace ES-модуля вида
`{ default: … }`, который возвращает `import()`.

## Данные

Файлы `data/ru.json` и `data/en.json` собираются из
[`emojibase-data`](https://github.com/milesj/emojibase) скриптом
`scripts/build-data.ts` и лежат в пакете. Формат (v1):

```json
{
  "v": 1,
  "locale": "ru",
  "categories": [{ "key": "smileys-emotion", "label": "Смайлики и люди" }],
  "emojis": [["😀", "улыбающееся лицо", "улыбка смех", 0]]
}
```

Строка эмодзи — это `[эмодзи, название, теги через пробел, индекс категории]`.
Из данных исключены компоненты тонов кожи (группа `component`) и региональные
индикаторы без группы: самостоятельных флагов в списке нет, а тона собираются
функцией `skinToneVariation` в рантайме.

Свой словарь можно собрать в том же формате и передать в `parseEmojiData` —
компонент не требует, чтобы данные пришли именно из этого пакета.

## API

### `EmojiPicker`

| Проп | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `data` | `EmojiData` | — | Разобранный словарь: `parseEmojiData(...)` или результат `useEmojiData` |
| `serverEmojis` | `readonly ServerEmoji[]` | — | Серверные эмодзи: отдельная вкладка и участие в поиске |
| `columns` | `number` | `8` | Колонок в сетке; минимум 1, `NaN` заменяется на значение по умолчанию |
| `cellSize` | `number` | `34` | Сторона ячейки в пикселях; минимум 1, `NaN` заменяется на значение по умолчанию |
| `locale` | `string` | `"ru"` | Локаль встроенных подписей: `ru` или `en` |
| `labels` | `Partial<Labels>` | — | Переопределение отдельных строк интерфейса |
| `skinTone` | `SkinTone` | — | Контролируемый тон кожи; без пропа хранится в localStorage |
| `onSkinToneChange` | `(tone: SkinTone) => void` | — | Вызывается при смене тона |
| `recentKey` | `string \| false` | `"goemoji:recent"` | Ключ localStorage для «Недавних»; `false` отключает их |
| `onSelect` | `(emoji: Emoji) => void` | — | Обязательный обработчик выбора |
| `onEscape` | `() => void` | — | Вызывается после Escape, если меню тонов закрыто |
| `serverIconUrl` | `string` | — | Картинка для вкладки «Сервер» вместо стандартной иконки |
| `className` | `string` | — | Дополнительный класс на корневой элемент `.ge-root` |

Тон кожи хранится в localStorage под ключом `goemoji:tone`, пока не передан
проп `skinTone`. Значения `SkinTone`: `"none"`, `"light"`, `"medium-light"`,
`"medium"`, `"medium-dark"`, `"dark"`.

### `useEmojiData`

```ts
const { data, error, loading } = useEmojiData(load, deps?);
```

Загружает словарь и разбирает его через `parseEmojiData`. Загрузчик вызывается
при монтировании и заново при изменении `deps`; незавершённый запрос
игнорируется, данные сбрасываются в `null` до прихода новых. В SSR эффект не
выполняется, поэтому `loading` остаётся `true`.

### Типы

| Тип | Поля |
| --- | --- |
| `Emoji` | `value: string`, `label: string`, `tags: string`, `category: number`, `server?: { id: string; animated: boolean }` |
| `ServerEmoji` | `id: string`, `name: string`, `animated: boolean` |
| `EmojiData` | `locale: string`, `categories: Category[]`, `emojis: Emoji[]` |
| `Category` | `key: string`, `label: string` |
| `SlimEmoji` | `[emoji, label, tags, category]` — строка сырого словаря |
| `Labels` | `search`, `empty`, `recent`, `server`, `skinTone`, `skinTones` |

Все типы экспортируются из корня пакета вместе с `EmojiPickerProps`.

### `goemoji/discord`

Модуль без React: подходит для ботов, API-роутов и обработки реакций.

| Функция | Описание |
| --- | --- |
| `parseCustomEmoji(value)` | Разбирает `<:name:id>` / `<a:name:id>`, для юникода вернёт `null` |
| `customEmojiToString({ name, id, animated? })` | Собирает строку `<a:name:id>` / `<:name:id>` |
| `customEmojiUrl(id, animated?, size?)` | Ссылка на CDN Discord; размер клампится к 16…4096, по умолчанию 48 |
| `normalizeEmojiText(value)` | Убирает вариационные селекторы U+FE0E/U+FE0F и ZWJ |
| `sameEmojiValue(saved, name, identifier)` | Сравнивает сохранённое значение с реакцией: серверные — по id, юникод — по нормализованному виду |

```ts
import { sameEmojiValue } from "goemoji/discord";

sameEmojiValue("<a:blob:777>", "blob", "blob:777"); // true
sameEmojiValue("❤️", "❤", "❤"); // true
```

## Клавиатура

| Клавиша | Действие |
| --- | --- |
| `←` / `→` | Предыдущий или следующий эмодзи; на краю строки — переход на соседнюю |
| `↑` / `↓` | Строка выше или ниже с выравниванием по колонке |
| `PageUp` / `PageDown` | На пять строк вверх или вниз |
| `Home` / `End` | Первый или последний эмодзи списка |
| `Enter` | Выбрать активный эмодзи |
| `Esc` | Закрыть меню тонов, затем вызвать `onEscape` |

Фокус остаётся в поле поиска: список связан с ним через
`aria-activedescendant`, как и положено combobox. При открытом меню тонов
стрелки, `Home`, `End` и `Esc` управляют меню, а не списком.

## Стилизация

Тема задаётся CSS-переменными на `.ge-root` (или на любом родителе) и не
использует `!important`:

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `--ge-bg` | `#1e1f22` | Фон пикера |
| `--ge-panel` | `#2b2d31` | Поле поиска, кнопки |
| `--ge-surface` | `#232428` | Поповер тонов |
| `--ge-border` | `#1a1b1e` | Рамки |
| `--ge-text` | `#dbdee1` | Основной текст |
| `--ge-muted` | `#949ba4` | Подписи и заголовки секций |
| `--ge-hover` | `rgba(255, 255, 255, 0.06)` | Наведение |
| `--ge-active` | `rgba(88, 101, 242, 0.4)` | Активная ячейка |
| `--ge-accent` | `#5865f2` | Акцент, фокус, активная вкладка |
| `--ge-radius` | `6px` | Скругление углов |
| `--ge-list-height` | `320px` | Высота списка |
| `--ge-font` | системный стек | Шрифт интерфейса |
| `--ge-font-emoji` | системный эмодзи-стек | Шрифт юникод-эмодзи |

```css
.my-picker {
  --ge-accent: #f2a65a;
  --ge-list-height: 420px;
}
```

Все элементы используют классы с префиксом `ge-` (`ge-root`, `ge-search`,
`ge-list`, `ge-cell`, `ge-tabs` и т. д.), поэтому точечные правки тоже
возможны, но обычно достаточно переменных.

## Доступность

- Поле поиска — `role="combobox"` с `aria-controls` и `aria-activedescendant`,
  список — `role="listbox"`, ячейки — `role="option"` с `aria-selected`.
- Вкладки категорий — `tablist`/`tab` с `aria-selected`.
- Меню тонов — `menu`/`menuitemradio` с `aria-checked`; фокус возвращается на
  кнопку при выборе и закрытии. Навигация: стрелки, `Home`, `End`, `Esc`.
- Клик вне поповера закрывает его, не перехватывая фокус.
- Анимация перехода к секции отключается при `prefers-reduced-motion: reduce`.
- Подписи по умолчанию есть для `ru` и `en`, остальные можно передать через
  `labels`.

## Производительность

Список рендерится построчно: в DOM находятся только строки из окна
виртуализации плюс несколько строк запаса. При скролле диапазон
пересчитывается в `requestAnimationFrame`, и React получает новое состояние
только если окно действительно сдвинулось. Заголовки секций прилипают к
верхней границе, а клик по вкладке подсвечивает её сразу и доезжает до секции
короткой анимацией.

Поиск выполняется по массиву эмодзи в памяти (1914 записей на локаль), поэтому
выдача обновляется на каждое нажатие клавиши без задержек.

## Лицензия

Код — MIT. Названия и теги эмодзи происходят из
[emojibase](https://github.com/milesj/emojibase) (MIT) и аннотаций Unicode CLDR
(Unicode License v3); подробности — в `THIRD_PARTY_NOTICES.md`.
