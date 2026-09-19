## ADDED Requirements

### Requirement: Content type filters
The search modal SHALL show a checkbox for each of three content kinds — abilities ("Перки"), combo-abilities ("Комбо"), and notes ("Заметки", which also covers wiki articles) — all checked by default. Entries of an unchecked kind SHALL NOT appear in the results, whether the query is empty or not, and the result count SHALL reflect only the entries shown.

#### Scenario: Defaults
- **WHEN** the search modal is opened for the first time
- **THEN** all three checkboxes are checked and all entry kinds are listed

#### Scenario: Unchecking a kind
- **WHEN** the user unchecks "Комбо"
- **THEN** no combo-ability cards are listed, other kinds still are, and the counter shows the reduced total

#### Scenario: Filters combine with the query
- **WHEN** a non-empty query is entered while some kinds are unchecked
- **THEN** only entries of the still-checked kinds that match the query are listed

#### Scenario: Notes checkbox covers wiki articles
- **WHEN** the user unchecks "Заметки"
- **THEN** neither notes nor wiki articles are listed

#### Scenario: Nothing checked
- **WHEN** all three checkboxes are unchecked
- **THEN** the list shows the empty "nothing found" state and the counter shows 0
