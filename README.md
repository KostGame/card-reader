# Card Reader

Card Reader - отдельное браузерное приложение проекта CardMark для распознавания CardMark-меток с камеры или загруженного изображения.

Проект развивается отдельно от [cardmark-sticker-generator](https://github.com/KostGame/cardmark-sticker-generator). Генератор отвечает за создание, печать и экспорт CardMark-меток, а Card Reader отвечает за загрузку manifest и будущий процесс распознавания.

## Текущий статус

PR-000 поднимает инфраструктуру проекта. Сейчас реализованы только загрузка JSON manifest, его валидация и отображение списка карт. Камера, загрузка изображения и распознавание CardMark-меток будут добавлены в следующих PR.

Приложение честно показывает, что распознавание пока не реализовано.

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

## GitHub Pages

Будущий URL публикации:

https://kostgame.github.io/card-reader/
