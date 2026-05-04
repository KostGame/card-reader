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

- открыть UI в мобильной ширине 390px;
- открыть UI в desktop ширине 1280px;
- убедиться, что тёмная тема включена по умолчанию;
- загрузить валидный manifest;
- убедиться, что валидный manifest отображает список карт и техническую информацию;
- загрузить невалидный manifest;
- убедиться, что ошибки валидации понятны;
- загрузить изображение;
- заменить изображение другим файлом;
- очистить изображение;
- загрузить non-image файл и проверить понятную ошибку;
- в ручном режиме ввести существующий `markerId`;
- в ручном режиме ввести отсутствующий `markerId`;
- в ручном режиме ввести некорректный `markerId`;
- декодировать valid grid `markerId` 0;
- декодировать valid grid `markerId` 42;
- декодировать valid grid `markerId` 127;
- проверить invalid grid size;
- проверить corrupted grid;
- проверить rotated grid 90/180/270;
- проверить UI test panel decoder из PR-002;
- проверить сопоставление decoded `markerId` с manifest;
- убедиться, что image upload не запускает decoder автоматически;
- загрузить synthetic image fixture;
- запустить "Найти CardMark-метки";
- проверить decoded markerId из synthetic image fixture;
- проверить manifest mapping после image decode;
- проверить blank/invalid image case;
- проверить debug overlay на preview;
- убедиться, что камера отсутствует;
- после merge проверить GitHub Pages.
