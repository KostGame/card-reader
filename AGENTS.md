# AGENTS.md

Правила для будущих агентов Card Reader.

## Codex-native workspace baseline

- По умолчанию работать в изолированном Codex-managed worktree, если Codex его предоставляет.
- Fresh clone на каждую задачу не требуется. Он используется для provisioning, recovery или явно заданного task-specific flow.
- Перед изменениями доказать repository/origin, scope задачи, base commit если задан, Git worktree membership и то, что текущий каталог является назначенным worktree, а не primary/canonical checkout.
- Detached HEAD допустим для inspect/edit/test/review.
- Перед первым commit создать или переключиться на выделенную task branch. По умолчанию prefix `agent/`, если task/repository policy не задаёт другой.
- Не работать напрямую в `main`, primary/user checkout, control repo, другом task workspace или неоднозначной копии.
- Обычные локальные Git-операции выполняет Codex. Push и PR допустимы, когда это разрешено текущей задачей/repository workflow; direct push в `main` запрещён.
- При sandbox-блокировке точной Git metadata mutation использовать native approval/escalation для этой операции, не расширяя ACL и не запуская Codex elevated.
- Не использовать stash/reset/clean/force push/history rewrite для сокрытия неожиданного состояния.
- PR по умолчанию Ready for Review. Merge требует отдельного разрешения.
- Если repository/worktree/base/task identity нельзя доказать, остановиться fail-closed.

## Project rules

- не использовать ИИ, OCR, серверную часть и внешние API;
- не менять CardMark v0 без отдельного решения и синхронного изменения генератора и reader;
- не переносить код из `cardmark-sticker-generator` без необходимости;
- не заявлять готовое распознавание без реализации и тестов;
- каждый PR должен обновлять `CHANGELOG.md` и документы в `docs/` при необходимости;
- каждый PR должен иметь отчёт по шаблону `docs/PR_REPORT_TEMPLATE.md`;
- UI должен честно отражать фактический статус функций;
- UI по умолчанию должен быть mobile-first и dark theme;
- не добавлять светлую тему или сложный theme switcher без отдельной задачи;
- не ухудшать мобильный сценарий ради desktop;
- decoder должен оставаться отделённым от image detection;
- PR-002 не должен добавлять camera/image recognition;
- при сомнении сверяться с CardMark v0 generator contract.
