## MODIFIED Requirements

### Requirement: Search trigger button
The topbar SHALL show a magnifying-glass button positioned between the app-version label (`.tb-app-version`) and the zoom controls (`.zoom-controls`), styled consistently with the existing `.btn`/`.zoom-btn` controls in that row. Pressing the physical `F` key (no modifier keys held) SHALL also open the search modal, from anywhere in the app, except while a text input, textarea, or contenteditable element has keyboard focus. This is keyed to the physical key position, not the character it produces, so it fires the same regardless of the active keyboard layout.

#### Scenario: Button opens the search modal
- **WHEN** the user clicks the magnifying-glass button
- **THEN** the search modal opens

#### Scenario: Keyboard shortcut opens the search modal
- **WHEN** the user presses the physical `F` key and no text input/textarea/contenteditable element currently has focus
- **THEN** the search modal opens and its input receives keyboard focus, the same as clicking the button

#### Scenario: Keyboard shortcut works regardless of keyboard layout
- **WHEN** the user presses the physical `F` key while a non-Latin keyboard layout is active (e.g. Russian ЙЦУКЕН, where that physical key produces "а")
- **THEN** the search modal opens exactly as it would under a Latin layout

#### Scenario: Keyboard shortcut suppressed while typing
- **WHEN** the user presses the physical `F` key while a text input, textarea, or contenteditable element has focus
- **THEN** the search modal does not open and the keystroke is left to behave normally (e.g. typing the letter it produces into that field)
