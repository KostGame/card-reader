# Project Brief

## Цель

Card Reader - браузерное приложение для распознавания CardMark-меток с камеры или загруженного изображения.

## Границы проекта

- статическое frontend-приложение;
- без backend;
- без ИИ;
- без OCR;
- без внешних API;
- без смешивания кода с `cardmark-sticker-generator`.

## CardMark v0 contract

- метка хранит только `markerId`;
- `markerId` находится в диапазоне `0..127`;
- смысл `markerId` определяется JSON manifest;
- CardMark v0 нельзя менять без синхронного изменения генератора и reader.

JSON manifest содержит:

- `format`;
- `version`;
- `deckType`;
- `markerSizeMm`;
- `cards[]`.

Элемент `cards[]` содержит:

- `id`;
- `group`;
- `name`;
- `markerId`.

## Текущий статус

После PR-002 проект содержит инфраструктуру, базовый UI shell, проверку JSON manifest, загрузку изображения с preview, ручную проверку `markerId` и декодер CardMark v0 из уже нормализованной сетки 7×7.

Распознавание по изображению, поиск меток, perspective transform, sampling из canvas и камера пока не реализованы.
