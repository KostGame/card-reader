# Checks

Перед отправкой PR:

```bash
npm ci
npm run check
npm test
npm run build
git diff --check
```

Ручные проверки:

- открыть UI в мобильной и desktop ширине;
- загрузить валидный manifest;
- убедиться, что валидный manifest отображает список карт и техническую информацию;
- загрузить невалидный manifest;
- убедиться, что ошибки валидации понятны;
- после merge проверить GitHub Pages.

