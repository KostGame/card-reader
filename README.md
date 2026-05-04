# Card Reader

Card Reader - отдельное браузерное приложение проекта CardMark для распознавания CardMark-меток с загруженного изображения и, в будущих PR, с камеры.

Проект развивается отдельно от [cardmark-sticker-generator](https://github.com/KostGame/cardmark-sticker-generator). Генератор отвечает за создание, печать и экспорт CardMark-меток, а Card Reader отвечает за загрузку manifest, изображений и распознавание меток.

## Текущий статус

После PR-003 приложение умеет:

- загружать JSON manifest, валидировать его и показывать список карт;
- загружать изображение из файла, показывать preview и метаданные;
- вручную проверять соответствие `markerId` карте из manifest;
- декодировать CardMark v0 из normalized grid 7x7 в технической панели;
- экспериментально искать CardMark-кандидаты на уже загруженном изображении;
- sampling найденного кандидата в сетку 7x7 и передавать ее в decoder PR-002;
- показывать найденный `markerId` и карту из manifest, если manifest загружен.

Распознавание из изображения в PR-003 является первым прототипом. Оно лучше работает на synthetic fixtures и контрастных, почти ровных изображениях. Реальные фото могут не распознаться.

Камера еще не реализована. Live camera UX, permission flow и обработка видеопотока остаются задачей PR-004.

## Ограничения

- без ИИ;
- без OCR;
- без серверной части;
- без внешних API;
- без OpenCV.js и внешних CV-библиотек в PR-003;
- без смешивания кода с `cardmark-sticker-generator`;
- без изменения CardMark v0 без синхронного решения для генератора и reader.

## CardMark v0

Reader совместим с текущим контрактом CardMark v0:

- метка хранит только `markerId`;
- `markerId` находится в диапазоне `0..127`;
- смысл `markerId` определяется JSON manifest;
- JSON manifest содержит `format`, `version`, `deckType`, `markerSizeMm`, `cards[]`;
- элемент `cards[]` содержит `id`, `group`, `name`, `markerId`;
- normalized grid decoder работает с сеткой 7x7, layout зафиксирован в `docs/DECISIONS.md`.

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

Каталог `fixtures/` содержит manifest, grid и image fixtures.

- `fixtures/manifests/` - валидные и невалидные manifest-примеры.
- `fixtures/grids/` - normalized grid fixtures CardMark v0 для decoder panel.
- `fixtures/images/` - небольшие synthetic image fixtures для ручной проверки image analysis pipeline.

Image fixtures не являются обещанием качества распознавания реальных фото. Они нужны, чтобы стабильно проверять file upload, candidate detection, sampling 7x7 и связь с decoder.

## GitHub Pages

Публикация:

https://kostgame.github.io/card-reader/
