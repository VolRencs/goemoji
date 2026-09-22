# Сторонние данные и лицензии

## emojibase-data

Файлы `data/ru.json` и `data/en.json` сгенерированы из пакета
[`emojibase-data`](https://github.com/milesj/emojibase) (лицензия MIT) скриптом
`scripts/build-data.ts`.

## Unicode CLDR

Названия и теги эмодзи в `emojibase-data` основаны на аннотациях
[Unicode CLDR](https://cldr.unicode.org/), которые распространяются по
[Unicode License v3](https://www.unicode.org/license.txt).

## Шрифт эмодзи

Пикер не поставляет изображений юникод-эмодзи и рендерит их системным шрифтом.
Список семейств задаётся переменной `--ge-font-emoji`.
