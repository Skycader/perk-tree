## ADDED Requirements

### Requirement: Content type filters
The search modal SHALL show a checkbox for each of four content kinds — abilities ("Перки"), combo-abilities ("Комбо"), unknown's notes ("Заметки"), and wiki articles ("Вики") — all checked by default. Entries of an unchecked kind SHALL NOT appear in the results, whether the query is empty or not, and the result count SHALL reflect only the entries shown.

#### Scenario: Defaults
- **WHEN** the search modal is opened for the first time
- **THEN** all four checkboxes are checked and all entry kinds are listed

#### Scenario: Unchecking a kind
- **WHEN** the user unchecks "Комбо"
- **THEN** no combo-ability cards are listed, other kinds still are, and the counter shows the reduced total

#### Scenario: Filters combine with the query
- **WHEN** a non-empty query is entered while some kinds are unchecked
- **THEN** only entries of the still-checked kinds that match the query are listed

#### Scenario: Notes and wiki are independent
- **WHEN** the user unchecks "Заметки"
- **THEN** notes are hidden but wiki articles are still listed, and vice versa for "Вики"

#### Scenario: Last checkbox is locked
- **WHEN** only one of the four checkboxes is checked
- **THEN** that checkbox is disabled (so the list can never be filtered down to nothing by type), and hovering it shows a hint explaining that the last type can't be turned off until another is enabled; it becomes enabled again as soon as another checkbox is checked
