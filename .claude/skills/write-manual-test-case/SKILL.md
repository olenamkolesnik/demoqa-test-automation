---
name: write-manual-test-case
description: Defines how to write human-readable manual test cases for `docs/test-cases/`. Test cases are generated from reviewed test conditions (`docs/test-conditions/`) — never directly from an endpoint or spec. Automated tests trace back to these via `@manualTestId`.
---

## Input

Test cases must be generated from existing test conditions. Before writing any test case:

1. Locate the relevant condition file in `docs/test-conditions/`
2. Read the condition's `Values / boundaries` field — each value or boundary becomes one test case
3. Reference the condition ID in the `Condition` field of every test case
4. After writing test cases, update the condition's `Test cases` field with the new IDs

---

## Folder structure

API-side files are named `<verb>-<resource>.md`, one file per endpoint operation (verb + path resource), mirroring the same naming convention used in `docs/test-conditions/`.

```
docs/test-cases/
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

Parallel structure with automation: `docs/test-cases/api/auth/` traces to `tests/api/account.api.spec.ts`; `docs/test-cases/ui/auth/` traces to `tests/ui/login.ui.spec.ts`.

### Deriving the input and output paths

Given `METHOD /path` for an API endpoint:

1. `<feature>` = the functional area (`auth`, `bookstore`, `collection`, `profile`) — same value used for the conditions file
2. `<verb>-<resource>` = same derivation as `write-test-conditions` (HTTP method lowercased + entity path segment)
3. Input conditions file: `docs/test-conditions/api/<feature>/<verb>-<resource>.md` — must already exist and be reviewed; if it doesn't exist yet, stop and say so rather than inventing conditions
4. Output test cases file: `docs/test-cases/api/<feature>/<verb>-<resource>.md` — same `<feature>`/`<verb>-<resource>` as the input, different top-level folder

Example: `DELETE /Account/v1/User/{UUID}` → input `docs/test-conditions/api/auth/delete-user.md`, output `docs/test-cases/api/auth/delete-user.md`.

Create the output folder if it doesn't exist yet. Do not ask for either path if it can be derived this way.

---

## Test case format

```markdown
### TC: <Action-based title>

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| ID             | <AREA-NNN>                                                    |
| Condition      | <COND-AREA-NNN — the condition this test case implements>     |
| Risk           | <Risk-N from docs/test-plan.md §8, or — if none>              |
| Preconditions  | <What must be true before the test runs>                      |
| Test data      | <Concrete values: specific strings, lengths, formats>         |
| Postconditions | <State of the system after the test completes — pass or fail> |
| Automation     | Not automated / Automated → `<file>.<type>.spec.ts`           |

**Steps & expected results**

| #   | Action                 | Expected result      |
| --- | ---------------------- | -------------------- |
| 1   | <What the tester does> | <What should happen> |
| 2   | ...                    | ...                  |

**Notes**
<Optional: known sandbox quirks, observed deviations, flakiness flags>
```

---

## Field guidance

### ID

Stable identifier for traceability. Format: `AREA-NNN`.

| Prefix | Covers                                               |
| ------ | ---------------------------------------------------- |
| `AUTH` | Registration, login, token generation, authorization |
| `BOOK` | Book catalog, search, book detail                    |
| `COL`  | Collection management (add, remove, view)            |
| `PROF` | Profile page, user details                           |

Examples: `AUTH-001`, `BOOK-003`, `COL-012`

IDs never change once assigned. If a test case is removed, its ID is retired — not reused.

### Condition

References the test condition this test case implements. Always populated — a test case without a condition reference means it was written without a coverage decision behind it.

```
# Single condition → single test case
Condition: COND-AUTH-001

# Single condition → multiple test cases (BVA boundaries)
# Both AUTH-005 and AUTH-006 reference the same condition
Condition: COND-AUTH-004
```

### Title

Action-based. Describes what is being done and under what condition. No ID in the title.

```
# Good
Register user with valid credentials
Register user with already existing username
Login with correct username and password
Login with incorrect password
Get book list without authentication token

# Bad
Test login              — no condition
Should work             — no action, no condition
[AUTH-001] valid user   — ID belongs in the field, not the title
```

### Risk

Reference a risk ID from `docs/test-plan.md §8`. Use `—` when no specific risk applies.

| Risk                                 | When to reference                                           |
| ------------------------------------ | ----------------------------------------------------------- |
| `Risk-1: Shared public backend`      | Any test that creates or deletes data on the shared backend |
| `Risk-2: API-seeded UI coupling`     | UI tests that use API calls in preconditions                |
| `Risk-3: Flaky async UI`             | UI tests with multi-step flows or async behavior            |
| `Risk-4: Auth sandbox inconsistency` | All negative authorization scenarios                        |

Multiple risks are allowed: `Risk-1, Risk-2`

### Preconditions

State what must be true before step 1. Be specific about how state is established.

```
# No setup needed
Preconditions: None

# Existing user, no session
Preconditions: User account exists (created via API: POST /Account/v1/User)

# Existing user with token
Preconditions: User account exists and token generated (POST /Account/v1/GenerateToken)

# UI tests requiring logged-in state
Preconditions: User account exists and is logged in (created and authenticated via API)

# UI tests that test the login flow itself
Preconditions: User account exists (created via API: POST /Account/v1/User)
```

### Test data

Use concrete, specific values. This is for human testers — not automation class references.

```
# Good — concrete and unambiguous
Test data:
  userName: "testuser_valid"
  password: "Test@1234" (meets complexity: 8+ chars, upper, lower, digit, special)

# Good — boundary value, class explicit
Test data:
  password — too short (below 8 chars): "Test@1" (6 chars)
  password — minimum valid (exactly 8 chars): "Test@123"
  password — missing special character: "TestUser1"

# Bad — vague
Test data: valid username and password

# Bad — automation reference
Test data: DataFactory.createUser()
```

### Steps and expected results

**API tests** — one action, one result is sufficient. The action is the request; the result is the response.

```markdown
| #   | Action                                                                                        | Expected result                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with `{ "userName": "testuser_auth001", "password": "Test@1234" }` | Status 201; body contains `userId` (non-empty string) and `username` equal to "testuser_auth001" |
```

**UI tests with flows** — one action per step, verify observable state after each meaningful change.

```markdown
| #   | Action                                         | Expected result                                                             |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Navigate to /login                             | Login form is visible with Username field, Password field, and Login button |
| 2   | Enter valid username and password, click Login | Page redirects to /profile                                                  |
| 3   | Observe page header                            | Username is displayed in the header                                         |
```

Rules:

- One user action per step — never combine navigate + fill + click in one step
- Expected result must be observable: status code, element visible, URL, text content
- Never write "it works", "success", or "user is logged in" without specifying what that looks like

### Postconditions

State of the system after the test completes — regardless of pass or fail. This is the manual equivalent of teardown thinking in automation.

```
# API test — created a user
Postconditions: User "testuser_auth001" deleted via DELETE /Account/v1/User/{userId}

# API test — no state created
Postconditions: None

# UI test — added a book to collection
Postconditions: Book removed from collection; user account deleted via API

# UI test — login only, no data created
Postconditions: User logged out; user account deleted via API
```

### Automation field

```
# Before automation
Automation: Not automated

# After automated test is written and merged
Automation: Automated → `account.api.spec.ts`
Automation: Automated → `login.ui.spec.ts`
```

---

## Complete example — API test case

```markdown
### TC: Register user with valid credentials

| Field          | Value                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| ID             | AUTH-001                                                                                              |
| Condition      | COND-AUTH-001                                                                                         |
| Risk           | Risk-1                                                                                                |
| Preconditions  | None                                                                                                  |
| Test data      | userName: "testuser_auth001" / password: "Test@1234" (valid complexity: upper, lower, digit, special) |
| Postconditions | User "testuser_auth001" deleted via DELETE /Account/v1/User/{userId}                                  |
| Automation     | Not automated                                                                                         |

**Steps & expected results**

| #   | Action                                                                                             | Expected result                                                                                  |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "userName": "testuser_auth001", "password": "Test@1234" }` | Status 201; body contains `userId` (non-empty string) and `username` equal to "testuser_auth001" |

**Notes**
Username must be unique on the shared backend. Use a random suffix in the automated version.
```

---

## What NOT to write

```markdown
# Vague test data

Test data: valid credentials ← what exactly?

# Vague expected result

| 1 | Click Login | Login succeeds ← what does success look like?

# Multiple actions in one step

| 1 | Open the site, find the login form, enter credentials and submit | User is logged in

# ID in title

### TC: [AUTH-001] Register user with valid credentials ← ID belongs in the field

# Gherkin syntax

Given a user exists
When they log in
Then they should see the profile ← not used in this project

# Automation class reference in test data

Test data: DataFactory.createUser() ← this is for automated tests only

# Missing condition reference

| ID | AUTH-001 |
| Condition | — | ← every test case must trace to a condition

# Priority assigned in test case

| Priority | High | ← priority belongs in the condition, not here

# Missing postconditions

| Postconditions | — | ← always state cleanup, even if "None"
```
