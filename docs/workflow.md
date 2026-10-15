# Рабочий процесс

## Запуск и проверка

```bash
python .claude/nocache_server.py 8199
```

- Это обёртка над `http.server` с `Cache-Control: no-store` (стоковый сервер
  отдаёт устаревшие 304 при быстрых правках). В Claude Code запускать через
  `preview_start({name: "static"})` (`.claude/launch.json`), порт 8199.
- Открывать только по http. Конфиги: `/?config=blank`, `/?config=vampire`.
- Проверять UI надо **в реальном сценарии**, а не на упрощённой подмене;
  DOM/computed-style — необходимое, но недостаточное доказательство. Квирки
  песочницы-браузера (rAF-троттлинг, скриншоты, синтетические клики и
  клавиши) — в [../claude/dev-workflow.md](../claude/dev-workflow.md).
- Полезно: `window.dbl(true)` — снимок геометрии окон/коннекторов.

## Планирование изменений: OpenSpec

Проект использует [OpenSpec](https://github.com/Fission-AI/OpenSpec)
(`openspec/`, CLI `openspec`, установлен глобально через npm —
`@fission-ai/openspec`). Для всего, что больше мелкой правки, сначала
оформляется change:

```
openspec/changes/<имя>/
  proposal.md   зачем и что меняем, какие capability затронуты
  design.md     контекст, решения и компромиссы
  specs/<capability>/spec.md   дельта требований (ADDED/MODIFIED/REMOVED)
  tasks.md      чек-лист реализации и проверки
```

Актуальные спецификации: `openspec/specs/` (`content-search`,
`note-file-embeds`, `obsidian-notes-import`). Завершённые изменения лежат в
`openspec/changes/archive/<дата>-<имя>/`.

### Фазы (propose → apply → archive)

Слэш-команды `/opsx:propose`, `/opsx:apply`, `/opsx:archive` в десктопном
клиенте Claude **не распознаются** («Unknown command»), хотя файлы лежат в
`.claude/commands/opsx/`. Автор об этом знает и принимает обходной путь:
выполнять те же шаги вручную по инструкциям из этих файлов.

1. **propose:** `openspec new change "<kebab-имя>"` → написать
   `proposal.md`, `specs/<capability>/spec.md`, `design.md`, `tasks.md` →
   `openspec validate <имя> --strict`.
2. **apply:** реализовать по `tasks.md`, отмечая `- [x]` только когда
   поведение реально работает; проверить в браузере.
3. **archive:** вручную влить дельту в `openspec/specs/<cap>/spec.md`
   (MODIFIED заменяет требование целиком, REMOVED убирает), проверить
   `openspec validate --specs --strict`, затем
   `mv openspec/changes/<имя> openspec/changes/archive/<ГГГГ-ММ-ДД>-<имя>`.

Требования к тексту: `### Requirement:` с SHALL/MUST, у каждого — минимум
один `#### Scenario:` (ровно 4 решётки). MODIFIED-блок обязан содержать
**все** сценарии прежнего требования.

Мелкие правки багов автор нередко просит делать напрямую, без change —
тогда спецификация может отставать от кода в деталях; это допустимо, но
стоит упомянуть.

## Git

- Ветка `master`; remote'ы: `origin` → GitHub `Skycader/perk-tree`,
  `origin-gitlab` → GitLab `daniil.ustimencko/perk-tree`.
- Коммиты и пуши — **только по просьбе**. «push to both» = в оба remote'а.
- Сообщения коротко, по сути, на английском или русском; добавлять
  подпись соавтора согласно инструкции текущей сессии.
- Предупреждения `LF will be replaced by CRLF` на Windows безвредны.
- Перед коммитом смотри `git status`; чужие/ранее сделанные правки автора
  (особенно `configs/default/default.config.js`) не откатывай.

## Стиль кода

`.prettierrc`: ширина 80, 2 пробела, одинарные кавычки, `;`, trailing comma
`all`, LF. Комментарии в коде — на английском, по умолчанию их нет; пишутся
только когда объясняют неочевидное «почему». Строки интерфейса — по-русски.

## Работа с автором

Короткие обратные связи, исправления на ходу, важна проверка «на глаз» в
реальном сценарии. Если нужен выбор — один точный вопрос с вариантами и
рекомендацией; без ответа — пауза. Подробно:
[../claude/collaboration.md](../claude/collaboration.md).

## Когда теряется история чата

Начни с [welcome.md](welcome.md), затем `CLAUDE.md`, затем документ по
области, с которой работаешь (оглавление — в welcome.md). Незавершённое
состояние смотри в `git status`, `git log`, `openspec list` и `todo.md`.
