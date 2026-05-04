# Roadmap

## PR-000: bootstrap - completed

- Vite + TypeScript + Vitest.
- CI через GitHub Actions.
- GitHub Pages deployment через Actions.
- UI shell.
- Загрузка и валидация JSON manifest.
- Документация проекта.

## PR-001: image input and test fixtures - completed

- Загрузка изображения в браузере.
- Набор тестовых fixture-изображений.
- Первичные проверки формата и размеров.
- Mobile-first dark UI.
- Ручная проверка `markerId` по загруженному manifest.

## PR-002: CardMark grid decoder without camera - current

- Декодер сетки CardMark v0 без camera pipeline.
- Unit-тесты декодирования.
- Проверка диапазона `markerId`.
- Orientation detection по anchor cells.
- UI test panel для normalized grid fixtures.

## PR-003: marker candidate detection from image - next

- Поиск кандидатов CardMark-меток на изображении.
- Набор fixtures для позитивных и негативных сценариев.
- Интеграционные тесты image pipeline.

## PR-004: browser camera mode

- Доступ к камере в браузере.
- Безопасная обработка разрешений.
- Mobile-friendly camera UX.

## PR-005: spread recognition UX

- UX для распознавания расклада.
- Сопоставление найденных `markerId` с загруженным manifest.
- Явные статусы ошибок и неопределённых результатов.
