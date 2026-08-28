---
name: write-test-conditions
description: Defines how to write test conditions — the "what to test" derived from spec, business rules, and heuristics — reviewed before test cases are written. They live in `docs/test-conditions/`, mirroring `docs/test-cases/` structure. Conditions link forward to test cases; test cases link back to conditions.
---

**Sequence**: Endpoint analysis → Test conditions (review) → Test cases → Automation. Never skip to test cases directly.

---

## Folder structure

API-side files are named `<verb>-<resource>.md`, one file per endpoint operation (verb + path resource), so the filename always maps 1:1 and unambiguously to a single `METHOD /path` — no editorial judgment call about which endpoints share a "feature" file.

```
docs/test-conditions/
├── api/
│   ├── auth/
│   │   ├── post-user.md
│   │   ├── get-user.md
│   │   ├── delete-user.md
│   │   ├── post-generate-token.md
│   │   └── post-authorized.md
│   ├── bookstore/
│   │   └── book-catalog.md
│   └── collection/
│       └── collection-management.md
└── ui/
    ├── auth/
    │   └── login.md
    ├── bookstore/
    │   └── book-catalog.md
    ├── collection/
    │   └── collection-management.md
    └── profile/
        └── profile-management.md
```

### Deriving the output path

Given `METHOD /path` for an API endpoint:

1. `<resource>` = the path segment identifying the entity (e.g. `/Account/v1/User` → `user`; `/BookStore/v1/Books` → `books`)
2. `<verb>` = the HTTP method, lowercased (`post`, `get`, `delete`, ...)
3. `<feature>` = the functional area the endpoint belongs to (`auth`, `bookstore`, `collection`, `profile`) — infer from the path/domain, matching an existing folder under `docs/test-conditions/api/` if one already fits
4. Output file: `docs/test-conditions/api/<feature>/<verb>-<resource>.md`

Example: `DELETE /Account/v1/User/{UUID}` → `docs/test-conditions/api/auth/delete-user.md`

Create the folder if it doesn't exist yet. Do not ask for the output path if it can be derived this way — only ask when the feature area is genuinely ambiguous.

### Sourcing the spec

Before writing the endpoint analysis, look for the endpoint definition in this order:

1. A corrected, live-verified `.md` doc under `docs/api-spec/` for the feature area, if one exists (e.g. `docs/api-spec/account-endpoints.md`) — trust this over the raw Swagger spec when the two disagree, since it has been corrected against observed live behavior
2. Any `*.swagger.json` file under `docs/api-spec/` covering the endpoint — raw spec, used only where no corrected `.md` doc exists yet, or to check field names/shapes the `.md` doc doesn't cover. Don't assume a single fixed filename: list `docs/api-spec/` and match by content, since more than one raw spec file may exist as the project grows.
3. Business rules not captured in either (e.g. password complexity) — ask the user if not already known from a prior conditions file in the same feature area

Do not ask the user to paste the spec section — read it directly from these files.

---

## File structure

Every conditions file has three parts in this order:

1. `## Endpoint analysis` — written first, before any conditions
2. Conditions grouped by `##` category heading (Input fields first, then State, then Authorization)
3. `## Coverage completeness check` — written last, after all conditions

---

## Endpoint analysis block

Written at the top of every file. Every bullet must map to at least one condition.

```markdown
## Endpoint analysis

**Endpoint:** <METHOD /path>
**Source:** <OpenAPI spec / observed behavior / business rule>

**Happy path**

- <1–2 valid scenarios>

**Negative cases**

- <Invalid input classes, missing fields, duplicate/conflict scenarios>

**Boundary cases**

- <Field: rule and boundaries>

**Authorization states**

- <Token state → expected outcome, or "Not applicable">

**Status codes and response shape**

| Scenario | Status | Response |
| -------- | ------ | -------- |
| ...      | ...    | ...      |

**Spec ambiguities / unknowns**

- <What is undocumented and needs live observation, or "None">
```

---

## Condition format

```markdown
### COND-AREA-NNN: <Short description>

| Field      | Value                                             |
| ---------- | ------------------------------------------------- |
| ID         | COND-AREA-NNN                                     |
| Priority   | High / Medium / Low                               |
| Category   | Input field / State / Behavior / Authorization    |
| Technique  | EP / BVA / Decision table / Exploratory heuristic |
| Source     | <Spec: field / Business rule / Heuristic>         |
| Test cases | —                                                 |

**What to cover**
<One sentence: what situation or input class this condition represents>

**Values / boundaries**
<Concrete values Claude uses to generate test cases>

**Notes**
<Optional: spec ambiguity, sandbox quirks>
```

### ID format

`COND-AUTH-NNN` / `COND-BOOK-NNN` / `COND-COL-NNN` / `COND-PROF-NNN`

Infeasible conditions: `COND-AREA-INF-NNN`

### Priority

Priority is a test design decision — assigned here in the condition, not in the test case.

| Priority   | When to assign                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **High**   | Core user journey; if this fails nothing else works. Assign High when a known risk directly affects reliability. |
| **Medium** | Important but non-blocking. Negative paths, edge cases on stable features, secondary flows.                      |
| **Low**    | Peripheral behavior, cosmetic validation, unlikely edge cases.                                                   |

### Technique

| Technique               | When to use                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EP`                    | Valid/invalid input classes — one representative per class                                                                                                                             |
| `BVA`                   | Length/range boundaries — min, min-1, max, max+1, empty                                                                                                                                |
| `Decision table`        | Combinations of states producing distinct outcomes                                                                                                                                     |
| `State transition`      | UI multi-page flows — a page/step sequence where the next valid step(s) depend on the current one (e.g. login → profile vs. login → error state staying on the login page)             |
| `Use case / scenario`   | End-to-end UI journeys spanning multiple pages, validating the sequence itself rather than any single field or state (e.g. "register, then log in, then add a book to the collection") |
| `Exploratory heuristic` | Situations not derivable from spec                                                                                                                                                     |

`State transition` and `Use case / scenario` apply to `docs/test-conditions/ui/` conditions; API conditions rarely need them since a single endpoint call has no multi-step sequence of its own. A UI condition using `State transition` should name the states/transition directly in **What to cover** (e.g. "From the login page, submitting valid credentials transitions to the profile page; invalid credentials keep the user on the login page with an error shown").

### Values / boundaries

The most important field — Claude generates one test case per value or boundary listed here. Be explicit.

```
# EP
Valid class: "Test@1234"
Invalid class — missing special char: "TestUser1"
Invalid class — missing digit: "Test@Pass"

# BVA
Empty (0 chars): ""
Below minimum (7 chars): "Test@12"
Minimum valid (8 chars): "Test@123"

# Decision table
Valid token + correct userId → 200
Valid token + wrong userId → 403
Missing token → 401
```

---

## Coverage rules (ISTQB minimum)

| Rule                        | Requirement                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EP valid                    | At least one condition per valid equivalence class                                                                                                                                                                                                                  |
| EP invalid                  | At least one condition per invalid equivalence class — never omit invalid classes                                                                                                                                                                                   |
| BVA                         | Every boundary needs two conditions: at the boundary and one step outside. Empty/null is always a boundary.                                                                                                                                                         |
| Decision table              | Every combination producing a distinct outcome gets its own condition                                                                                                                                                                                               |
| Independence                | Each condition must be independently testable — no ordering dependencies between conditions                                                                                                                                                                         |
| No trigger/effect splitting | If exercising condition A necessarily also exercises condition B (e.g. "valid input succeeds" vs. "success returns shape X"), they are one condition, not two — merge them. Before finalizing, check every condition pair in the same happy-path scenario for this. |
| Required fields             | Every required field needs at least one valid and one invalid (missing) condition                                                                                                                                                                                   |
| Infeasible                  | Conditions that cannot be tested against this SUT must be documented, not silently omitted                                                                                                                                                                          |

---

## Infeasible condition format

```markdown
### COND-AREA-INF-NNN: <Description> (infeasible)

| Field      | Value                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| ID         | COND-AREA-INF-NNN                                                                                            |
| Priority   | High / Medium / Low — how urgent this would be to test if it ever becomes feasible, not how urgent it is now |
| Category   | ...                                                                                                          |
| Technique  | ...                                                                                                          |
| Source     | ...                                                                                                          |
| Test cases | —                                                                                                            |

**What to cover**
<What would be tested if feasible>

**Why infeasible**
<Why it cannot be tested against demoqa>

**Mitigation**
<Contract assumption, deferred condition, or alternative approach>
```

---

## Completeness checklist

Written as the last section of every conditions file after all conditions are done.

```markdown
## Coverage completeness check

| Question                                                                               | Answer                             |
| -------------------------------------------------------------------------------------- | ---------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes / No — missing: <field>        |
| Does every required input field have at least one invalid EP condition?                | Yes / No — missing: <field>        |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes / No — missing: <boundary>     |
| Does every authorization state produce a distinct condition?                           | Yes / No / Not applicable          |
| Are all infeasible conditions documented?                                              | Yes / No — missing: <condition>    |
| Does every analysis bullet map to at least one condition?                              | Yes / No — unmapped: <bullet>      |
| Are all conditions independently testable?                                             | Yes / No — dependency: <condition> |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No / Yes — merge: <condition IDs>  |

**Coverage gaps identified**

- <Gap description, or "None">

**Deferred conditions**

- <Condition deferred with reason, or "None">
```

---

## Anti-patterns

```
Values: valid password, invalid password    ← vague — unusable for test case generation
Technique: —                               ← always label; use Exploratory heuristic if unsure
Source: —                                  ← always state origin
COND-AUTH-003: All invalid password cases  ← too broad — split by class
Test cases: AUTH-003                       ← leave as — until cases are written
(no infeasible entry for token expiry)     ← document as COND-AREA-INF-NNN, never omit silently
(no completeness check section)            ← always include at end of file
COND-AUTH-007 depends on COND-AUTH-001    ← conditions must be independent
COND-AUTH-001: valid input succeeds
COND-AUTH-002: success returns shape X    ← same observation, one test case exercises both — merge into COND-AUTH-001
```
