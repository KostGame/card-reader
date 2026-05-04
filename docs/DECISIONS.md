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

PR-002 не распознаёт реальные фото. Поиск кандидатов, перспективная нормализация и sampling из изображения добавляются отдельными этапами.

## 2026-05-04: CardMark v0 grid layout

Решение:

Reader фиксирует текущий layout CardMark v0, совместимый с `KostGame/cardmark-sticker-generator`.

Фактический layout:

- размер сетки: 7x7;
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

Decoder может обнаруживать неправильный размер сетки, некорректные ячейки, повреждённый frame, неверные orientation anchors, несовпадение CRC, неверные inverted ID bits и неподдерживаемые version bits. Decoder не исправляет ошибки.

## 2026-05-04: Start image recognition with uploaded images before camera

Решение:

Первый image recognition pipeline в PR-003 работает только с уже загруженным изображением.

Причина:

Нужно проверить candidate detection, grid sampling и decode pipeline до добавления live camera UX.

Последствия:

Камера остаётся задачей PR-004. PR-003 работает через file upload и synthetic fixtures. Загруженное изображение не анализируется автоматически: пользователь запускает экспериментальную проверку отдельной кнопкой.

## 2026-05-04: Keep PR-003 image processing dependency-free

Решение:

В PR-003 не используются OpenCV.js и другие внешние CV-библиотеки.

Причина:

Проект должен оставаться статическим, лёгким и понятным для GitHub Pages.

Последствия:

Распознавание ограничено простым dependency-free pipeline: grayscale, threshold, connected components, axis-aligned bounds, sampling 7x7 и decoder PR-002. Полноценная perspective normalization в PR-003 не реализована, поэтому реальные фото под углом могут не распознаться. Улучшения computer vision будут добавляться постепенно.
