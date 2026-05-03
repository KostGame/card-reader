# Roadmap

## PR-000: bootstrap

- Vite + TypeScript + Vitest.
- CI через GitHub Actions.
- GitHub Pages deployment через Actions.
- UI shell.
- Загрузка и валидация JSON manifest.
- Документация проекта.

## PR-001: image input and test fixtures

- Загрузка изображения в браузере.
- Набор тестовых fixture-изображений.
- Первичные проверки формата и размеров.

## PR-002: CardMark grid decoder without camera

- Декодер сетки CardMark v0 без camera pipeline.
- Unit-тесты декодирования.
- Проверка диапазона `markerId`.

## PR-003: marker candidate detection from image

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

