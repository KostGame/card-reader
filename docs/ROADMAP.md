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
- Preview изображения и метаданные файла.
- Fixture-структура для manifest и image scenarios.
- Mobile-first dark UI.
- Ручная проверка `markerId` по загруженному manifest.

## PR-002: CardMark grid decoder without camera - completed

- Декодер сетки CardMark v0 без camera pipeline.
- Unit-тесты декодирования.
- Проверка диапазона `markerId`.
- Orientation detection по anchor cells.
- UI test panel для normalized grid fixtures.

## PR-003: marker candidate detection from image - current

- Поиск CardMark-кандидатов на уже загруженном изображении.
- Axis-aligned нормализация кандидата без полноценного perspective transform.
- Sampling кандидата в normalized grid 7x7.
- Передача sampled grid в decoder PR-002.
- Экспериментальный UI image analysis panel.
- Debug overlay для candidates и decoded markers.
- Synthetic image fixtures для ручной проверки pipeline.
- Unit-тесты image processing logic.

## PR-004: browser camera mode - next

- Доступ к камере в браузере.
- Безопасная обработка разрешений.
- Mobile-friendly camera UX.
- Переиспользование image pipeline из PR-003 без изменения CardMark v0.

## PR-005: spread recognition UX

- UX для распознавания расклада.
- Сопоставление найденных `markerId` с загруженным manifest.
- Явные статусы ошибок и неопределённых результатов.
