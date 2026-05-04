# Normalized grid fixtures

Эти fixtures описывают уже нормализованную логическую сетку CardMark v0. Это не изображения, не camera frames и не результат распознавания фото.

Формат:

```json
{
  "format": "cardmark-grid-fixture",
  "version": "0",
  "markerId": 42,
  "orientation": 0,
  "grid": [[1, 1, 1, 1, 1, 1, 1]]
}
```

- `grid` всегда 7×7.
- `1` означает тёмную ячейку.
- `0` означает светлую ячейку.
- `orientation` указывает поворот fixture относительно канонической ориентации.

PR-002 использует эти fixtures только для проверки decoder logic. Поиск метки на изображении, перспективная нормализация и sampling из canvas будут отдельным этапом.

