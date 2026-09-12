## Purpose

Lets the user find an ability, combo-ability, unknown's note, or wiki article by typing part of its name or text, and jump straight to it, instead of scanning the tree and popups by eye.

## ADDED Requirements

### Requirement: Search trigger button
The topbar SHALL show a magnifying-glass button positioned between the app-version label (`.tb-app-version`) and the zoom controls (`.zoom-controls`), styled consistently with the existing `.btn`/`.zoom-btn` controls in that row.

#### Scenario: Button opens the search modal
- **WHEN** the user clicks the magnifying-glass button
- **THEN** the search modal opens

### Requirement: Modal chrome
The search modal SHALL present as a centered overlay dialog titled "Поиск", with a close control (×) in its top-right corner, and SHALL dim the rest of the page and lock page scroll while open, consistent with the app's existing license modal.

#### Scenario: Opening the modal
- **WHEN** the search modal opens
- **THEN** a dimmed backdrop appears behind it, the page beneath stops scrolling, and the modal's search input receives keyboard focus immediately

#### Scenario: Closing via the × control
- **WHEN** the user clicks the × control
- **THEN** the modal and backdrop close and page scroll is restored

#### Scenario: Closing via Escape or backdrop click
- **WHEN** the user presses Escape, or clicks the dimmed backdrop outside the modal box
- **THEN** the modal and backdrop close and page scroll is restored

### Requirement: Live substring filtering
As the user types into the search input, the modal SHALL recompute and display matching results immediately, without a separate submit action, using case-insensitive substring matching.

#### Scenario: Typing narrows results
- **WHEN** the user types a substring that appears in some abilities', combos', notes', or wiki articles' searchable text
- **THEN** only entries containing that substring (case-insensitively) are shown as results

#### Scenario: Empty query
- **WHEN** the search input is empty
- **THEN** no results are shown (or a neutral empty state — no partial/random listing)

### Requirement: Ability result cards
Each matching ability SHALL be shown as a rectangular card containing a colored square (matching that ability's category color as used elsewhere in the tree) in its top-left, the ability's name as the card title, and its description text below. Matching is performed against the ability's name and description only — not against its per-level (`skillLevelDescriptions`) text.

#### Scenario: Ability name match
- **WHEN** the query matches part of an ability's name
- **THEN** a card for that ability appears with its category-colored square, name, and description

#### Scenario: Ability description match
- **WHEN** the query matches part of an ability's description but not its name
- **THEN** a card for that ability appears, with the matching word(s) in its description visually highlighted

### Requirement: Combo-ability result cards
Each matching combo-ability SHALL be shown as a card in the same shape as an ability card (colored square, title, description), where the title is the combo's own name and the description is its combo text. Matching is performed against the combo's title and description text.

#### Scenario: Combo has an explicit name
- **WHEN** a combo's description begins with a `==Name==`-style marker
- **THEN** that name (with the markers stripped) is used as the card's title

#### Scenario: Combo has no explicit name
- **WHEN** a combo's description has no leading name marker
- **THEN** the card still renders with a generated fallback title, never a blank title

### Requirement: Note and wiki-article result cards
Each matching unknown's note or wiki article SHALL be shown as a card in the same rectangular shape as ability cards, but without a colored square (notes and wiki articles have no category), showing its title and content text. Matching is performed against the entry's title and content.

#### Scenario: Note/article title or content match
- **WHEN** the query matches part of a note's or wiki article's title or content
- **THEN** a card for that entry appears without a colored square, with any matched word(s) in the content visually highlighted

### Requirement: Match highlighting
Wherever a query match falls inside a result card's description/content text, the matched word(s) SHALL be visually highlighted so the user can see why that result matched.

#### Scenario: Highlight rendering
- **WHEN** a result card's description/content contains the search query as a substring
- **THEN** that substring is rendered with a distinct highlight style within the card

### Requirement: Pagination
Search results SHALL be paginated at 10 cards per page, with controls to move to the next and previous pages. The full result set is not scrolled as one long list.

#### Scenario: More than 10 results
- **WHEN** a query matches more than 10 entries across all searched types
- **THEN** only the first 10 are shown initially, with a control to view the next page

#### Scenario: Query changes while paginated
- **WHEN** the user is on a page other than the first and changes the query
- **THEN** the result set is recomputed and pagination resets to the first page

### Requirement: Clicking an ability or combo result
Clicking an ability or combo-ability result card SHALL close the search modal, scroll the tree so the corresponding perk is in view, and apply the same focus/highlight effect already used for in-text `<perk>` references elsewhere in the app. For a combo result, the perk scrolled to and highlighted is the host perk (the perk whose tooltip displays that combo entry).

#### Scenario: Clicking an ability card
- **WHEN** the user clicks an ability result card
- **THEN** the search modal closes, the tree scrolls to that ability's perk, and it is highlighted the same way clicking an inline `<perk>` reference highlights its target

#### Scenario: Clicking a combo card
- **WHEN** the user clicks a combo-ability result card
- **THEN** the search modal closes, the tree scrolls to the combo's host perk, and it is highlighted the same way clicking an inline `<perk>` reference highlights its target

### Requirement: Clicking a note or wiki-article result
Clicking a note or wiki-article result card SHALL open that entry's existing linked-popup UI, identical to how that entry is already presented elsewhere in the app, without closing the search modal.

#### Scenario: Clicking a note card
- **WHEN** the user clicks an unknown's-note result card
- **THEN** the same note popup UI used elsewhere in the app opens for that note, and the search modal remains open

#### Scenario: Clicking a wiki-article card
- **WHEN** the user clicks a wiki-article result card
- **THEN** the same tip/article popup UI used elsewhere in the app opens for that article, and the search modal remains open
