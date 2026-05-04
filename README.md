# Card Reader

Card Reader - отдельное браузерное приложение проекта CardMark для распознавания CardMark-меток с камеры или загруженного изображения.

Проект развивается отдельно от [cardmark-sticker-generator](https://github.com/KostGame/cardmark-sticker-generator). Генератор отвечает за создание, печать и экспорт CardMark-меток, а Card Reader отвечает за загрузку manifest и будущий процесс распознавания.

## Текущий статус

После PR-001 приложение умеет загружать JSON manifest, валидировать его, показывать список карт, загружать изображение из файла и показывать preview с метаданными. UI проектируется как mobile-first и использует тёмную тему по умолчанию.

Распознавание CardMark-меток всё ещё не реализовано. Камера и decoder pipeline будут добавлены в следующих PR.

Ручной режим проверки позволяет ввести `markerId` и посмотреть карту из загруженного manifest. Это нужно для проверки manifest и будущих fixtures, а не для автоматического распознавания.

## Ограничения

- без ИИ;
- без OCR;
- без серверной части;
- без внешних API;
- без смешивания кода с `cardmark-sticker-generator`;
- без изменения CardMark v0 без синхронных изменений генератора и reader.

## CardMark v0

Reader совместим с текущим контрактом CardMark v0:

- метка хранит только `markerId`;
- `markerId` находится в диапазоне `0..127`;
- смысл `markerId` определяется JSON manifest;
- JSON manifest содержит `format`, `version`, `deckType`, `markerSizeMm`, `cards[]`;
- элемент `cards[]` содержит `id`, `group`, `name`, `markerId`.

## Команды

```bash
npm ci
npm run dev
npm run check
npm test
npm run build
npm run preview
```

## Fixtures

Каталог `fixtures/` содержит небольшие manifest-примеры и структуру для будущих image fixtures. `fixtures/images/synthetic-placeholder.svg` предназначен только для проверки preview и не является эталоном распознавания.

## GitHub Pages

Будущий URL публикации:

https://kostgame.github.io/card-reader/
