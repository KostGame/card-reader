# Decisions

## 2026-05-04: Start Card Reader as a separate repository

Решение:

Card Reader развивается в отдельном репозитории `card-reader`.

Причина:

Генератор и распознаватель имеют разные задачи, риски и циклы разработки.

Последствия:

`cardmark-sticker-generator` остаётся генератором печатных материалов и JSON manifest.

`card-reader` становится отдельным браузерным приложением для загрузки manifest, камеры, изображения и распознавания CardMark-меток.

