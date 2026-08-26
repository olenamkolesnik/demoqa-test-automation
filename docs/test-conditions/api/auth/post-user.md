# Test Conditions — POST /Account/v1/User (Registration)

## Endpoint analysis

**Endpoint:** POST /Account/v1/User
**Source:** OpenAPI spec (`docs/api-spec/book-store-api.swagger.json`) cross-checked against observed live behavior (`docs/api-spec/account-endpoints.md`) and the business rule for password complexity given in this task. Live behavior wins wherever the two disagree.

**Happy path**

- Valid, unique `userName` + a password satisfying all five complexity rules → account created.

**Negative cases**

- Duplicate `userName` (an already-registered username) → conflict.
- Password violating the complexity rule, isolated by which single rule is violated (missing uppercase / missing lowercase / missing digit / missing special character) → rejected with the complexity error message.
- Missing `userName` (required field per spec).
- Missing `password` (required field per spec).
- Empty-string `userName`.
- Empty-string `password` (also the BVA lower boundary — see below).

**Boundary cases**

- `password` length: the only documented boundary is a minimum of 8 characters (no documented maximum in the business rules or either spec). BVA applies at the empty (0 chars), one-below-minimum (7 chars), and minimum-valid (8 chars) boundaries. A "just above minimum" case is not a boundary in ISTQB terms (only the edges of the valid/invalid partition are boundaries) and is covered instead by the happy-path valid EP condition.
- `userName`: no length or format rule is documented anywhere (spec, live-verified doc, or the business rules given for this task) beyond it being a required string. No BVA is derivable without inventing an undocumented rule — see Spec ambiguities below.

**Authorization states**

- Not applicable — `POST /Account/v1/User` is the registration endpoint itself and does not require a bearer token or prior authorization (confirmed: no `Authorization` header parameter in the spec for this operation, and the live-verified doc lists no auth-state row for it).

**Status codes and response shape**

| Scenario                                                             | Status | Response                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                                                              | 201    | `{ userID: string, username: string, books: [] }` — **live-confirmed `userID` (capital ID)**; note the swagger spec's `CreateUserResult` definition says `userId` (lowercase d), which is the swagger inaccuracy, not the live contract                                                                                |
| Duplicate `userName`                                                 | 406    | `{ code: "1204", message: "User exists!" }` — live-confirmed; `code` is a **string**, not `number` as swagger's `MessageModal` claims                                                                                                                                                                                  |
| Weak password (complexity violation, min 8 chars with all 4 classes) | 400    | `{ code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` — **live-confirmed; swagger does not document 400 for this endpoint at all** |
| Missing/absent or empty `userName` and/or `password`                 | 400    | `{ code: "1200", message: "UserName and Password required." }` — **live-confirmed 2026-08-26**; one shared code path for absent field, empty string, or both fields missing — does NOT fall through to the weak-password (1300) path                                                                                   |

**Spec ambiguities / unknowns**

- Swagger documents only `404`/`406` as error responses for this endpoint; it omits `400` entirely, which the live-verified doc confirms is the actual weak-password status. Swagger cannot be trusted for the full status-code set — 404's actual trigger condition (if any, for this endpoint) is undocumented in the live-verified doc and not derivable; treated as infeasible below rather than guessed.
- ~~Behavior for a missing/absent `userName` or `password` field (as opposed to an empty string) is not documented by either source.~~ Resolved by live check 2026-08-26 — see COND-AUTH-006/008/009/010 and the status table above.
- No documented maximum length for `userName` or `password` — do not invent one; see Boundary cases above.
- Whether `userName` has any format constraint (allowed characters, min length) is undocumented — treated as infeasible to derive a meaningful invalid-format EP class without inventing a rule not given by the spec or business rules.

---

## Input fields

### COND-AUTH-001: Valid userName and password create an account with the live-confirmed response shape

| Field      | Value                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| ID         | COND-AUTH-001                                                                                                      |
| Priority   | High                                                                                                               |
| Category   | Input field                                                                                                        |
| Technique  | EP                                                                                                                 |
| Source     | Spec: RegisterViewModel; Business rule: password complexity; Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-001                                                                                                           |

**What to cover**
The valid equivalence class for both required fields together — a unique username paired with a password satisfying all five complexity rules — resulting in `201` with the live-confirmed response shape `{ userID, username, books: [] }`. Specifically confirms the capital-ID casing, since swagger's own `CreateUserResult` definition disagrees with live behavior on this exact field name.

**Values / boundaries**

```
# EP
Valid class: userName = unique string (e.g. faker-generated), password = "Aa1!aaaa" (8 chars, all four classes present)
Expected status: 201
Body keys present: userID (capital ID), username, books (empty array)
Body key absent: userId (lowercase d) must NOT be the key used — distinguishes live behavior from the swagger definition
```

**Notes**
This is the sole happy-path condition. Originally split into a separate input-trigger condition and a separate response-shape condition, but merged: the two are not independently testable (one successful registration call satisfies both), so keeping them separate only duplicated the same observation under two IDs. The response-shape assertion is kept explicit here specifically to catch a regression back toward trusting the swagger spec's incorrect casing; see CLAUDE.md's "API source of truth" note.

---

### COND-AUTH-002: Password fails complexity — no uppercase letter

| Field      | Value                              |
| ---------- | ---------------------------------- |
| ID         | COND-AUTH-002                      |
| Priority   | High                               |
| Category   | Input field                        |
| Technique  | EP                                 |
| Source     | Business rule: password complexity |
| Test cases | AUTH-002                           |

**What to cover**
Invalid equivalence class: password missing the required uppercase character, all other rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing uppercase: "aa1!aaaa"
```

**Notes**
Isolated to violate exactly one rule so the condition tests that specific class, not a compound failure.

---

### COND-AUTH-003: Password fails complexity — no lowercase letter

| Field      | Value                              |
| ---------- | ---------------------------------- |
| ID         | COND-AUTH-003                      |
| Priority   | High                               |
| Category   | Input field                        |
| Technique  | EP                                 |
| Source     | Business rule: password complexity |
| Test cases | AUTH-003                           |

**What to cover**
Invalid equivalence class: password missing the required lowercase character, all other rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing lowercase: "AA1!AAAA"
```

**Notes**
—

---

### COND-AUTH-004: Password fails complexity — no digit

| Field      | Value                              |
| ---------- | ---------------------------------- |
| ID         | COND-AUTH-004                      |
| Priority   | High                               |
| Category   | Input field                        |
| Technique  | EP                                 |
| Source     | Business rule: password complexity |
| Test cases | AUTH-004                           |

**What to cover**
Invalid equivalence class: password missing the required digit, all other rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing digit: "Aaaa!aaa"
```

**Notes**
—

---

### COND-AUTH-005: Password fails complexity — no special character

| Field      | Value                              |
| ---------- | ---------------------------------- |
| ID         | COND-AUTH-005                      |
| Priority   | High                               |
| Category   | Input field                        |
| Technique  | EP                                 |
| Source     | Business rule: password complexity |
| Test cases | AUTH-005                           |

**What to cover**
Invalid equivalence class: password missing the required special/non-alphanumeric character, all other rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing special char: "Aa1aaaaa"
```

**Notes**
—

---

### COND-AUTH-006: Password length boundary — empty string

| Field      | Value                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-006                                                                                       |
| Priority   | High                                                                                                |
| Category   | Input field                                                                                         |
| Technique  | BVA                                                                                                 |
| Source     | Business rule: password complexity (minimum 8 characters); Observed behavior: live check 2026-08-26 |
| Test cases | AUTH-006                                                                                            |

**What to cover**
Lower boundary at zero — the empty string is both a required-field violation and the extreme case of the length-minimum boundary.

**Values / boundaries**

```
# BVA
Empty (0 chars): ""
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Deliberately kept as its own condition rather than folded into COND-AUTH-008 (missing-field), per the rule that empty/null is always its own boundary. Live-confirmed 2026-08-26: an empty password does NOT hit the weak-password/complexity path (`code: "1300"`) as originally assumed — DemoQA treats an empty string identically to the field being entirely absent, returning the same `1200`/"required" response as COND-AUTH-008/009. Original assumption of a 1300 weak-password response was incorrect and has been corrected here.

---

### COND-AUTH-007: Password length boundary — one below minimum

| Field      | Value                                                     |
| ---------- | --------------------------------------------------------- |
| ID         | COND-AUTH-007                                             |
| Priority   | Medium                                                    |
| Category   | Input field                                               |
| Technique  | BVA                                                       |
| Source     | Business rule: password complexity (minimum 8 characters) |
| Test cases | AUTH-007                                                  |

**What to cover**
The boundary immediately below the documented minimum length — 7 characters, otherwise satisfying all complexity classes.

**Values / boundaries**

```
# BVA
Below minimum (7 chars): "Aa1!aaa"
```

**Notes**
Paired with COND-AUTH-001's minimum-valid case (8 chars) to bracket the boundary per the two-conditions-per-boundary rule.

---

### COND-AUTH-008: Missing userName field

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-008                                                                                        |
| Priority   | High                                                                                                 |
| Category   | Input field                                                                                          |
| Technique  | EP                                                                                                   |
| Source     | Spec: RegisterViewModel (`required: [userName, password]`); Observed behavior: live check 2026-08-26 |
| Test cases | AUTH-008                                                                                             |

**What to cover**
Required-field violation: `userName` entirely absent from the request body (not empty string — the key itself is missing).

**Values / boundaries**

```
# EP
Invalid class — field absent: { password: "Aa1!aaaa" } (no userName key)
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Live-confirmed 2026-08-26 against https://demoqa.com. Same status/body as COND-AUTH-009 (missing password) and COND-AUTH-010 (empty userName) — DemoQA uses one shared "required" code path (`1200`) for both fields, whether absent or empty, rather than distinguishing missing-userName from missing-password.

---

### COND-AUTH-009: Missing password field

| Field      | Value                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-009                                                                                        |
| Priority   | High                                                                                                 |
| Category   | Input field                                                                                          |
| Technique  | EP                                                                                                   |
| Source     | Spec: RegisterViewModel (`required: [userName, password]`); Observed behavior: live check 2026-08-26 |
| Test cases | AUTH-009                                                                                             |

**What to cover**
Required-field violation: `password` entirely absent from the request body.

**Values / boundaries**

```
# EP
Invalid class — field absent: { userName: "someUniqueUser" } (no password key)
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Live-confirmed 2026-08-26 against https://demoqa.com. Same status/body as COND-AUTH-008 (missing userName) — see that condition's Notes for the shared-code-path detail.

---

### COND-AUTH-010: Empty userName

| Field      | Value                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| ID         | COND-AUTH-010                                                                      |
| Priority   | Medium                                                                             |
| Category   | Input field                                                                        |
| Technique  | BVA                                                                                |
| Source     | Spec: RegisterViewModel (required field); Observed behavior: live check 2026-08-26 |
| Test cases | AUTH-010                                                                           |

**What to cover**
Lower boundary at zero for `userName` — an empty string is a distinct case from the field being entirely absent (COND-AUTH-008).

**Values / boundaries**

```
# BVA
Empty (0 chars): userName = ""
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Live-confirmed 2026-08-26 against https://demoqa.com. Same status/body as COND-AUTH-006 (empty password) and COND-AUTH-008/009 (fields absent) — DemoQA treats an empty string identically to the field being entirely missing.

---

## State

### COND-AUTH-011: Duplicate username is rejected

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-011                                         |
| Priority   | High                                                  |
| Category   | State                                                 |
| Technique  | Decision table                                        |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-011                                              |

**What to cover**
Registering with a `userName` that already exists (created by a prior successful registration) is rejected, distinct from any input-validation failure.

**Values / boundaries**

```
# Decision table
New unique userName + valid password → 201
Already-registered userName + valid password → 406
```

**Notes**
Requires test-time setup (create a user first, then attempt a duplicate) — this is a state-dependent condition, not a pure input-validation one, hence its own category.

---

## Authorization

Not applicable — this endpoint does not require prior authorization (see Endpoint analysis). No conditions in this category.

---

## Infeasible conditions

### COND-AUTH-INF-001: 404 response trigger for this endpoint (infeasible)

| Field      | Value                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-INF-001                                                                                                    |
| Priority   | Medium — an undocumented status-code path on the core registration endpoint, but no evidence it's actually reachable |
| Category   | Behavior                                                                                                             |
| Technique  | Exploratory heuristic                                                                                                |
| Source     | Spec: swagger lists 404 as a possible response                                                                       |
| Test cases | —                                                                                                                    |

**What to cover**
What request condition triggers a `404` response from `POST /Account/v1/User`, per swagger's documented (but unexplained) response set.

**Why infeasible**
Neither the swagger spec nor the live-verified doc describes what input or state produces a 404 for this specific endpoint (unlike GET/DELETE `/Account/v1/User/{UUID}`, where 404-equivalent behavior is documented elsewhere as a wrong-password 404 on a different endpoint). Swagger is already known to be unreliable for this endpoint's status-code set (it omits the real 400 case entirely), so guessing a trigger for 404 here would mean inventing an untested scenario rather than deriving one from evidence.

**Mitigation**
Deferred until a live exploratory session against the sandbox surfaces a genuine 404 trigger for this endpoint, if one exists. Until then, no test case should assert a 404 contract for this endpoint.

---

### COND-AUTH-INF-002: userName maximum length / format boundary (infeasible)

| Field      | Value                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| ID         | COND-AUTH-INF-002                                                           |
| Priority   | Low — peripheral boundary with no evidence any such constraint exists       |
| Category   | Input field                                                                 |
| Technique  | BVA                                                                         |
| Source     | Spec: RegisterViewModel (untyped string, no format/length constraint given) |
| Test cases | —                                                                           |

**What to cover**
A maximum-length or character-format boundary for `userName`, analogous to the password's documented minimum-length rule.

**Why infeasible**
No source (swagger, the live-verified doc, or the business rules provided for this task) documents any length or format constraint on `userName` beyond "required string." Asserting a boundary here would mean inventing a rule not present in any input to this analysis.

**Mitigation**
Deferred. If a future live-verification pass observes an actual constraint (e.g. the API rejects a very long username), promote this to a real BVA condition at that point.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — COND-AUTH-001 covers both `userName` and `password` valid classes together                                                                                    |
| Does every required input field have at least one invalid EP condition?                | Yes — COND-AUTH-008 (userName absent), COND-AUTH-009 (password absent), COND-AUTH-002–005 (password invalid classes)                                                |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes — COND-AUTH-006 (empty), COND-AUTH-007 (min-1, 7 chars), COND-AUTH-001 (min-valid, 8 chars); COND-AUTH-010 (userName empty)                                     |
| Does every authorization state produce a distinct condition?                           | Not applicable — endpoint has no authorization states                                                                                                               |
| Are all infeasible conditions documented?                                              | Yes — COND-AUTH-INF-001 (404 trigger), COND-AUTH-INF-002 (userName max length/format)                                                                               |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                             |
| Are all conditions independently testable?                                             | Yes — no condition depends on another executing first or in a specific order; COND-AUTH-011 requires its own setup step but not another condition's prior execution |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — the original COND-AUTH-001/002 trigger-vs-shape split was identified and merged into a single COND-AUTH-001 before finalizing this file                        |

**Analysis-to-condition mapping**

- Happy path (valid registration, live-confirmed response shape) → COND-AUTH-001
- Negative: duplicate userName → COND-AUTH-011
- Negative: password complexity violations (4 classes) → COND-AUTH-002, COND-AUTH-003, COND-AUTH-004, COND-AUTH-005
- Negative: missing userName / missing password → COND-AUTH-008, COND-AUTH-009
- Negative: empty userName / empty password → COND-AUTH-010, COND-AUTH-006
- Boundary: password length (0, 7, 8) → COND-AUTH-006, COND-AUTH-007, COND-AUTH-001
- Boundary: userName undocumented constraint → COND-AUTH-INF-002
- Authorization: not applicable → no condition needed
- Status codes/response shape: 201 shape, 406 duplicate, 400 weak password, 400 missing/empty required field (live-confirmed 2026-08-26) → COND-AUTH-001, COND-AUTH-011, COND-AUTH-002–005, COND-AUTH-006/007, COND-AUTH-008/009/010; undocumented 404 → COND-AUTH-INF-001
- Spec ambiguities: missing-field behavior — resolved by live check 2026-08-26, see COND-AUTH-006/008/009/010; userName format undocumented → COND-AUTH-INF-002; 404 trigger undocumented → COND-AUTH-INF-001

**Coverage gaps identified**

- None beyond what is already captured as infeasible conditions (404 trigger, userName max length/format).

**Deferred conditions**

- COND-AUTH-INF-001 (404 trigger) — deferred pending live exploratory observation.
- COND-AUTH-INF-002 (userName max length/format) — deferred pending live exploratory observation or a documented constraint appearing in a future spec update.
