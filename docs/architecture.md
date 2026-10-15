# Архитектура

Чистые ES-модули, без сборки. `index.html` подключает `js/main.js`, дальше
всё идёт через `import`. Библиотеки лежат локально в `libs/`
(`marked.min.js` — Markdown, `html2canvas.min.js` — экспорт PNG, шрифт
JetBrains Mono).

## Как грузится страница

1. `index.html`: загрузочный экран (`#page-loader`), ранний inline-скрипт
   для стартовой заметки и `MOBILE_ADAPT`/зума (до первой отрисовки).
2. `js/main.js` импортирует модули в порядке: фон (`background.js`), зум,
   мобильные вкладки, коннекторы, спектр, модалка лицензии, **поиск**,
   тултип, фокус перка, дерево, экспорт, заметки-попапы.
3. `js/load-config.js` через **top-level `await`** выбирает конфиг по
   `?config=<имя>` → `configs/<имя>/<имя>.config.js` (нет файла — warn и
   `default`). Все потребители импортируют `CONFIG` **только отсюда**.
   `js/load-notes.js` делает то же для заметок (нет файла — пустой массив).
4. `js/tree.js` строит DOM: шапка, теги, 3 колонки глав, перки, таблица
   рангов, нижняя панель «Опасности» (`vulns`).
5. После `document.fonts.ready` рисуются коннекторы, восстанавливается
   открытый тултип (по F5), через `MIN_LOADER_MS` убирается загрузчик и
   показывается стартовая заметка.

## Карта `js/`

| Файл | Роль |
| --- | --- |
| `main.js` | Точка входа; глобальные обработчики (Esc, клики по `<perk>`/`<note>`/`<tip>`, лицензия, поиск) |
| `load-config.js`, `load-notes.js` | Выбор конфига/заметок по `?config` |
| `constants.js` | Цвета, пороги, раскладка окон, `MOBILE_ADAPT`, `NOTES`, `MODAL`… |
| `dom-refs.js` | Ссылки на статичные DOM-узлы |
| `tree.js` | Дерево, колонки, ранги, теги, «Опасности»; экспортирует `colRefs`, `perkCountByColor` |
| `connectors.js` | Линии-коннекторы колонок и верхняя шина |
| `tooltip.js` | Тултип перка: уровни, вторичные окна, медиа, аудио, комбо, layout (самый большой файл) |
| `windows.js` | `createWin`, `destroyWins`, `resolveWindowCols` — фабрика и размещение вторичных окон |
| `chain-tip.js` | Подсказка-иконка цепочки зависимостей (`requiredPerks`) |
| `spectre.js` | Попап «спектр» (цветовые категории, доли перков) |
| `markdown.js` | Конвейер `renderMD`/`renderLevelMD` и все `process*Tags` |
| `note-link-popup.js` | Каскад попапов заметок/подсказок «лесенкой», `<file src>` |
| `notes-popup.js` | Стартовая заметка внизу (prev/next, счётчик, ←/→) |
| `search-modal.js` | Окно поиска (см. [search.md](search.md)) |
| `perk-focus.js` | `focusPerkById` — скролл + затемнение + свечение перка |
| `license-modal.js` | Модалка «Лицензия/Обновления» (вкладки из `MODAL`) |
| `video-lightbox.js`, `snippet-lightbox.js` | Увеличенный просмотр видео / сниппета |
| `zoom.js` | UI-зум 50–200 %; функция `scale()` для «сырых» пикселей |
| `mobile-tabs.js` | Вкладки колонок на узких экранах |
| `export-png.js` | Экспорт дерева в PNG (html2canvas) |
| `background.js` | Звёздное небо + молнии на `<canvas id="bg-canvas">` |
| `debug.js` | `window.dbl()` — снимок геометрии окон/коннекторов |

## Конвейер текста (`js/markdown.js`)

```
сырой текст
  → processWikiLinkTags   [[...]]            (до marked)
  → marked.parse / parseInline
  → processHighlightTags  ==текст== → <mark>
  → processNoteTags       <note id>
  → processTipTags        <tip id>
  → processPerkTags       <perk>
  → processSquareTags     <square color>
  → processSvgTags        <svg name="tip|warning">
```

`renderMD` — полный Markdown (абзацы); `renderLevelMD` — лёгкий вариант для
строк уровней (inline, без обёртки в `<p>`, блоки только если они есть).
Подробности и причины порядка — [../dev-wiki/NOTES_SYSTEM.md](../dev-wiki/NOTES_SYSTEM.md).

## Вторичные окна тултипа

Окна: `IMG`, `SNIPPET`, `AUDIO`, `EXTRA`, `TIP`, `COMBO` — создаются
`createWin(type)` (контейнер + заголовок `.tt-header` + контент + SVG-
коннектор). `WINDOW_PRIORITY` и колонки заполнения (`COL_FILL_ORDER`)
определяют порядок; на уровне перка можно переопределить: `positions`
(колонка 1/2/3 для вида окна), `priority` (порядок видов), `order`
(`from_left`/`from_right`). Медиа-окна: `imgs[]` + `switchMode`.

## CSS (`css/`)

`base.css` (топбар, кнопки, общие классы), `tree.css`, `sidebar.css`,
`tooltip.css`, `windows.css` (вторичные окна, слайдер/вкладки картинок),
`notes.css` (попапы заметок), `license.css`, `search.css`, `loader.css`,
`mobile.css`. Стиль и палитра — [../UI-STYLE-GUIDE.md](../UI-STYLE-GUIDE.md).

## Подводные камни

Короткий список с причинами — в [../claude/gotchas.md](../claude/gotchas.md):
SVG только через `createElementNS`; `MOBILE_ADAPT` продублирован в
`constants.js` и в раннем скрипте `index.html`; «сырые» px-константы
оборачивать в `scale()`; обработчик, удаляющий свой попап, должен вызвать
`stopPropagation`. Цикл «поиск → открытие заметки» учитывает, что
`openLinkPopup` асинхронный (см. `.note-link-trigger` в `note-link-popup.js`).

## Прочие папки

| Папка | Содержимое |
| --- | --- |
| `assets/` | Картинки/видео/аудио перков; имя часто содержит размер `name_W_H.ext` (подсказка размера до загрузки) |
| `assets/snippets/` | Автономные HTML/JS-страницы (для `snippets[]`) |
| `wiki/tips/` | Markdown-статьи для вики (`<file src>`) |
| `tools/` | `import-obsidian-notes.js` — конвертер заметок Obsidian → `default.notes.js` |
| `openspec/` | Спецификации и архив изменений (OpenSpec) |
| `.claude/` | Настройки Claude Code, `launch.json`, `nocache_server.py`, команды `opsx` |
