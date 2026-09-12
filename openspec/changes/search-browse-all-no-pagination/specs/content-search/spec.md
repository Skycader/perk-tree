## MODIFIED Requirements

### Requirement: Live substring filtering
As the user types into the search input, the modal SHALL recompute and display matching results immediately, without a separate submit action, using case-insensitive substring matching. When the search input is empty, every ability, combo-ability, note, and wiki article SHALL be shown, unfiltered, so the user can browse the full set of content without typing anything.

#### Scenario: Typing narrows results
- **WHEN** the user types a substring that appears in some abilities', combos', notes', or wiki articles' searchable text
- **THEN** only entries containing that substring (case-insensitively) are shown as results

#### Scenario: Empty query
- **WHEN** the search input is empty (including right after the modal opens)
- **THEN** every ability, combo-ability, note, and wiki article is shown as a result, in the same card form filtering would use, with no highlighting applied

## REMOVED Requirements

### Requirement: Pagination
**Reason**: Real content volume (55 abilities, 41 combo-abilities, 92 notes, a handful of wiki articles — well under 200 items total even unfiltered) never approaches a scale pagination or virtual scrolling exists to solve. A plain scrollable list is simpler and shows the same information.
**Migration**: Results render as one continuous list inside the existing scrollable results container. The next/previous controls are removed from the modal; the counter next to them now shows a running total match count instead of a page position (see the new `Result count display` requirement).

## ADDED Requirements

### Requirement: Full result list, no pagination
The search results container SHALL display every matching entry (or, with an empty query, every entry) in one continuously scrollable list. No page-splitting controls are shown.

#### Scenario: Many results
- **WHEN** a query (or the empty-query browse-all state) matches more entries than fit in the visible modal height
- **THEN** all of them are present in the results list and the list scrolls to reach the rest — no next/previous controls appear anywhere in the modal

### Requirement: Result count display
The modal SHALL show a count of how many entries are currently listed, updating live as the query changes.

#### Scenario: Filtered count
- **WHEN** a non-empty query matches some number of entries
- **THEN** that number is displayed as the current result count

#### Scenario: Browse-all count
- **WHEN** the query is empty and every entry is shown
- **THEN** the total entry count across all four content types is displayed
