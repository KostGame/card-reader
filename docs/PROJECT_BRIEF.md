# Project Brief

## Цель

Card Reader - браузерное приложение для распознавания CardMark-меток с загруженного изображения и, в будущих PR, с камеры.

## Границы проекта

- статическое frontend-приложение;
- без backend;
- без ИИ;
- без OCR;
- без внешних API;
- без смешивания кода с `cardmark-sticker-generator`;
- без изменения CardMark v0 без отдельного решения.

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

Normalized grid layout CardMark v0 зафиксирован в `docs/DECISIONS.md`.

## Текущий статус

После PR-003 проект содержит инфраструктуру, mobile-first dark UI, проверку JSON manifest, загрузку изображения с preview, ручную проверку `markerId`, декодер CardMark v0 из normalized grid 7x7 и экспериментальный image pipeline для уже загруженных файлов.

Image pipeline в PR-003 выполняет поиск кандидатов, axis-aligned sampling 7x7 и передачу sampled grid в decoder PR-002. Это не camera mode и не полноценное распознавание любых реальных фото. Лучше всего pipeline работает на synthetic fixtures и контрастных, почти ровных изображениях.

Камера, live video UX и более надёжная computer vision обработка остаются будущими этапами.
