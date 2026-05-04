# Card Reader

Card Reader - отдельное браузерное приложение проекта CardMark для распознавания CardMark-меток с камеры или загруженного изображения.

Проект развивается отдельно от [cardmark-sticker-generator](https://github.com/KostGame/cardmark-sticker-generator). Генератор отвечает за создание, печать и экспорт CardMark-меток, а Card Reader отвечает за загрузку manifest и будущий процесс распознавания.

## Текущий статус

После PR-002 приложение умеет загружать JSON manifest, валидировать его, показывать список карт, загружать изображение из файла, показывать preview с метаданными и декодировать CardMark v0 из уже нормализованной сетки 7×7. UI проектируется как mobile-first и использует тёмную тему по умолчанию.

Распознавание CardMark-меток по изображению всё ещё не реализовано. Камера, поиск меток на фото, perspective transform и sampling из canvas будут добавлены в следующих PR.

Ручной режим проверки позволяет ввести `markerId` и посмотреть карту из загруженного manifest. Это нужно для проверки manifest и будущих fixtures, а не для автоматического распознавания.

Секция “Тест декодера” предназначена только для технической проверки normalized grid fixtures из `fixtures/grids/`. Она не анализирует загруженное изображение.

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

`fixtures/grids/` содержит normalized grid fixtures CardMark v0. Это матрицы 7×7, а не изображения.

## GitHub Pages

Будущий URL публикации:

https://kostgame.github.io/card-reader/
