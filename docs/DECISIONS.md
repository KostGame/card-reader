# Decisions

## 2026-05-04: Start Card Reader as a separate repository

Решение:

Card Reader развивается в отдельном репозитории `card-reader`.

Причина:

Генератор и распознаватель имеют разные задачи, риски и циклы разработки.

Последствия:

`cardmark-sticker-generator` остаётся генератором печатных материалов и JSON manifest.

`card-reader` становится отдельным браузерным приложением для загрузки manifest, камеры, изображения и распознавания CardMark-меток.

## 2026-05-04: Use mobile-first dark UI by default

Решение:

Card Reader использует тёмную тему по умолчанию и mobile-first интерфейс.

Причина:

Основной сценарий использования предполагает телефон, камеру, просмотр расклада и работу в условиях разного освещения.

Последствия:

Все будущие экраны должны проектироваться сначала под мобильный браузер. Desktop layout может быть улучшением, но не должен ломать мобильный сценарий.

## 2026-05-04: Decode CardMark v0 from normalized grid before image detection

Решение:

В PR-002 декодер работает только с уже нормализованной сеткой, без анализа изображения.

Причина:

Нужно отделить чистую логику декодирования CardMark v0 от более рискованной задачи computer vision.

Последствия:

PR-002 не распознаёт реальные фото. Поиск кандидатов, перспективная нормализация и sampling из изображения будут отдельным этапом PR-003.

## 2026-05-04: CardMark v0 grid layout

Решение:

Reader фиксирует текущий layout CardMark v0, совместимый с `KostGame/cardmark-sticker-generator`.

Фактический layout:

- размер сетки: 7×7;
- координаты zero-based: `(row, col)`;
- внешний frame: все клетки в row `0`, row `6`, col `0`, col `6` равны `1`;
- orientation anchors: `(1,1)=1`, `(1,5)=1`, `(5,1)=1`, `(5,5)=0`;
- payload cells: 21 внутренняя клетка row-major после пропуска anchors;
- payload layout: 7 ID bits MSB-first, 4 CRC bits, 7 inverted ID bits, 3 version bits;
- version bits для v0: `000`;
- `markerId`: integer `0..127`;
- orientation определяется по асимметричным anchor cells;
- checksum: CRC4-like checksum из генератора, initial `1010`, shift left + append bit, если previous top bit был `1`, XOR `0011`, сохранить lower 4 bits;
- parity отдельно отсутствует;
- сильной error correction нет.

Последствия:

Decoder может обнаруживать неправильный размер сетки, некорректные ячейки, повреждённый frame, неверные orientation anchors, несовпадение CRC, неверные inverted ID bits и неподдерживаемые version bits. Decoder не ищет сетку на изображении и не исправляет ошибки.
