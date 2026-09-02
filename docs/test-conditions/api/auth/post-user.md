# Test Conditions — POST /Account/v1/User (Registration)

## Endpoint analysis

**Endpoint:** POST /Account/v1/User
**Source:** Live-verified doc (`docs/api-spec/account-endpoints.md`) cross-checked against the raw OpenAPI spec (`docs/api-spec/book-store-api.swagger.json`). Where the two disagree, the live-verified doc wins — per CLAUDE.md's "API source of truth" note, the swagger spec is known to be inaccurate for this endpoint. The password complexity rule is taken from the live error message, which the live-verified doc records as the only reliable statement of it.

**Happy path**

- Unique `userName` + a password satisfying all five complexity rules → account created, `201` with the live-confirmed response shape.

**Negative cases**

- Duplicate `userName` (an already-registered username) → conflict.
- Password violating the complexity rule, isolated by which single rule is violated (missing uppercase / missing lowercase / missing digit / missing special character) → rejected with the complexity error message.
- Missing `userName` (required per `RegisterViewModel`).
- Missing `password` (required per `RegisterViewModel`).
- Empty-string `userName`.
- Empty-string `password` (also the BVA lower boundary — see below).

**Boundary cases**

- `password` length: the only documented boundary is a minimum of 8 characters, stated in the live error message. No maximum is documented in either source. BVA therefore applies at the empty (0 chars), one-below-minimum (7 chars), and minimum-valid (8 chars) boundaries. A "just above minimum" value is not a boundary in ISTQB terms — only the edges of the valid/invalid partition are — and is covered by the happy-path valid EP condition instead.
- `userName`: neither source documents any length or format rule beyond "required string." No BVA is derivable without inventing an undocumented constraint — see Spec ambiguities below.

**Authorization states**

- Not applicable. This is the registration endpoint itself: the swagger operation `AccountV1UserPost` declares no `Authorization` header parameter, and the live-verified doc lists no auth-state row for it (unlike `GET`/`DELETE /Account/v1/User/{UUID}`, which both document a `401` missing/invalid-token row).

**Test level rationale**

The password-complexity conditions (COND-AUTH-002 to COND-AUTH-007) are input validation, which would normally sit at component/unit level — one rule per case is a unit-test shape. They are specified at system level here for two reasons.

1. **No lower level is accessible.** The SUT is a third-party deployed application (`https://demoqa.com`). There is no source, no component-test seam, and no way to reach the validator except over HTTP. The alternative to covering these at system level is not covering them at all.
2. **What is asserted is the API contract, not the validation logic.** Each condition verifies that a rejection surfaces as the documented status, `code`, and body shape — that a weak password yields `400`/`1300` rather than a `500`, a silent `201`, or a differently-shaped error envelope. That is integration behaviour no unit test could observe.

Deliberate redundancy across levels, accepted because the lower level is unavailable. In an in-house system these would be pushed down to unit tests, and system level would keep one representative case per error contract plus the happy path.

**Status codes and response shape**

| Scenario                                                             | Status | Response                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                                                              | 201    | `{ userID: string, username: string, books: [] }` — **live-confirmed `userID`, capital ID**; swagger's `CreateUserResult` definition says `userId` (lowercase d), which is a swagger inaccuracy, not the live contract                                                                                                 |
| Duplicate `userName`                                                 | 406    | `{ code: "1204", message: "User exists!" }` — live-confirmed; `code` is a **string**, not the `number` swagger's `MessageModal` declares                                                                                                                                                                               |
| Weak password (complexity violation, min 8 chars with all 4 classes) | 400    | `{ code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` — **live-confirmed; swagger does not document 400 for this endpoint at all** |
| Missing/absent or empty `userName` and/or `password`                 | 400    | `{ code: "1200", message: "UserName and Password required." }` — **live-verified 2026-09-02**; documented by neither source, established by direct observation. One shared code path for an absent key or an empty string, on either field; does **not** fall through to the weak-password (`1300`) path               |

**Spec ambiguities / unknowns**

- Swagger documents only `404`/`406` as error responses here and omits `400` entirely, which the live-verified doc confirms is the real weak-password status. Swagger cannot be trusted for this endpoint's status-code set. What triggers a `404` — if anything — is undocumented in the live-verified doc and not derivable; treated as infeasible rather than guessed (COND-AUTH-INF-001).
- ~~Behavior for an absent or empty-string `userName`/`password` is documented by neither source.~~ **Resolved by live check 2026-09-02** — `400` with `{ code: "1200", message: "UserName and Password required." }` for all four cases (either field, absent or empty). See COND-AUTH-006/008/009/010 and the status table above. The finding was added to `docs/api-spec/account-endpoints.md` in the same pass, so it now lives in the project's source of truth rather than only in this file.
- No documented maximum length for `userName` or `password` in either source — do not invent one; see Boundary cases.
- Whether `userName` has any format constraint (allowed characters, minimum length) is undocumented — treated as infeasible to derive a meaningful invalid-format EP class without inventing a rule (COND-AUTH-INF-002).
- Neither source documents behavior for a non-string `userName` or `password` (a JSON number, boolean, or null where the spec declares `string`). `RegisterViewModel` types both fields as `string`, so a non-string value is an invalid class by type. Excluded from coverage by a project scope decision — not reachable from any real client of this endpoint — rather than by the documentation gap; see COND-AUTH-INF-003.

---

## Input fields

### COND-AUTH-001: Valid userName and password create an account with the live-confirmed response shape

| Field      | Value                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ID         | COND-AUTH-001                                                                                                                  |
| Priority   | High                                                                                                                           |
| Category   | Input field                                                                                                                    |
| Technique  | EP                                                                                                                             |
| Source     | Spec: RegisterViewModel; Business rule: password complexity (from live error message); Observed behavior: account-endpoints.md |
| Test cases | —                                                                                                                              |

**What to cover**
The valid equivalence class for both required fields together — a unique username paired with a password satisfying all five complexity rules — producing `201` with the live-confirmed response shape `{ userID, username, books: [] }`. Also confirms the capital-ID casing, since swagger's `CreateUserResult` disagrees with live behavior on this exact field name.

**Values / boundaries**

```
# EP
Valid class: userName = unique string (e.g. faker-generated), password = "Aa1!aaaa" (8 chars, all four classes present)
Expected status: 201
Body keys present: userID (capital ID), username, books (empty array)
Body key absent: userId (lowercase d) must NOT be the key used — distinguishes live behavior from the swagger definition
```

**Notes**
The sole happy-path condition. The input trigger (valid credentials) and its effect (201 with the correct casing) are not independently testable — one successful registration call exercises both — so they are kept as one condition rather than split, per the no-trigger/effect-splitting rule.

The `"Aa1!aaaa"` value doubles as the minimum-valid (8-char) BVA boundary, pairing with COND-AUTH-007's 7-char case to bracket the length minimum.

The response-shape assertion is deliberately explicit: it exists to catch a regression back toward trusting swagger's incorrect casing. See CLAUDE.md's "API source of truth" note and the live-verified doc's "Important inconsistency" callout, which confirms `POST /Account/v1/User` returns `userID` while `GET /Account/v1/User/{UUID}` returns `userId` for the same conceptual field.

---

### COND-AUTH-002: Password fails complexity — no uppercase letter

| Field      | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| ID         | COND-AUTH-002                                                |
| Priority   | High                                                         |
| Category   | Input field                                                  |
| Technique  | EP                                                           |
| Source     | Business rule: password complexity (from live error message) |
| Test cases | —                                                            |

**What to cover**
Invalid equivalence class: password missing the required uppercase character, all other complexity rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing uppercase: "aa1!aaaa" (8 chars, has lowercase, digit, special)
Expected status: 400
Expected body: { code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }
```

**Notes**
Isolated to violate exactly one rule, so the condition exercises that specific invalid class rather than a compound failure. The API returns one shared complexity message for all four violations — it does not name which rule failed — so all of COND-AUTH-002 to COND-AUTH-005 assert the same body and differ only in input.

---

### COND-AUTH-003: Password fails complexity — no lowercase letter

| Field      | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| ID         | COND-AUTH-003                                                |
| Priority   | High                                                         |
| Category   | Input field                                                  |
| Technique  | EP                                                           |
| Source     | Business rule: password complexity (from live error message) |
| Test cases | —                                                            |

**What to cover**
Invalid equivalence class: password missing the required lowercase character, all other complexity rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing lowercase: "AA1!AAAA" (8 chars, has uppercase, digit, special)
Expected status: 400
Expected body: { code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }
```

**Notes**
See COND-AUTH-002 on the shared complexity message.

---

### COND-AUTH-004: Password fails complexity — no digit

| Field      | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| ID         | COND-AUTH-004                                                |
| Priority   | High                                                         |
| Category   | Input field                                                  |
| Technique  | EP                                                           |
| Source     | Business rule: password complexity (from live error message) |
| Test cases | —                                                            |

**What to cover**
Invalid equivalence class: password missing the required digit, all other complexity rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing digit: "Aaaa!aaa" (8 chars, has uppercase, lowercase, special)
Expected status: 400
Expected body: { code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }
```

**Notes**
See COND-AUTH-002 on the shared complexity message.

---

### COND-AUTH-005: Password fails complexity — no special character

| Field      | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| ID         | COND-AUTH-005                                                |
| Priority   | High                                                         |
| Category   | Input field                                                  |
| Technique  | EP                                                           |
| Source     | Business rule: password complexity (from live error message) |
| Test cases | —                                                            |

**What to cover**
Invalid equivalence class: password missing the required special/non-alphanumeric character, all other complexity rules satisfied.

**Values / boundaries**

```
# EP
Invalid class — missing special char: "Aa1aaaaa" (8 chars, has uppercase, lowercase, digit)
Expected status: 400
Expected body: { code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }
```

**Notes**
See COND-AUTH-002 on the shared complexity message.

---

### COND-AUTH-006: Password length boundary — empty string

| Field      | Value                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-006                                                                                                                                                             |
| Priority   | High                                                                                                                                                                      |
| Category   | Input field                                                                                                                                                               |
| Technique  | BVA                                                                                                                                                                       |
| Source     | Spec: RegisterViewModel (required field); Business rule: password complexity (min 8 chars); Observed behavior: docs/api-spec/account-endpoints.md (live check 2026-09-02) |
| Test cases | —                                                                                                                                                                         |

**What to cover**
Lower boundary at zero for `password` — the empty string is both a required-field violation and the extreme case of the length-minimum boundary.

**Values / boundaries**

```
# BVA
Empty (0 chars): password = ""
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Kept as its own condition rather than folded into COND-AUTH-009 (missing field), per the rule that empty/null is always its own boundary.

Live-verified 2026-09-02 against `https://demoqa.com`. The open question — whether an empty password takes the weak-password path (`1300`) or a required-field path — is resolved in favour of the latter: an empty string returns `1200`/"UserName and Password required.", **not** the complexity error, even though a 0-char password does violate the 8-char minimum. DemoQA treats an empty string as an absent field and never reaches the complexity check.

Confirmed distinct from the complexity path by a control in the same pass: a present 7-character password (COND-AUTH-007) returns `1300` under otherwise identical conditions. The two paths are genuinely separate, so a test case asserting `1300` here would fail.

---

### COND-AUTH-007: Password length boundary — one below minimum

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-007                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | BVA                                                                          |
| Source     | Business rule: password complexity (minimum 8 characters, from live message) |
| Test cases | —                                                                            |

**What to cover**
The boundary immediately below the documented minimum length — 7 characters, otherwise satisfying every complexity class, so length is the only rule violated.

**Values / boundaries**

```
# BVA
Below minimum (7 chars): "Aa1!aaa" (has uppercase, lowercase, digit, special — only length fails)
Expected status: 400
Expected body: { code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }
```

**Notes**
Paired with COND-AUTH-001's minimum-valid 8-character password to bracket the boundary, per the two-conditions-per-boundary rule.

This condition and COND-AUTH-006 sit at opposite ends of the same length boundary but take **different code paths**: a present 7-character password reaches the complexity check and returns `1300`, while a 0-character password is treated as an absent field and returns `1200` without ever reaching it. Both were confirmed live 2026-09-02, this one serving as the control that established the distinction. The two are therefore not interchangeable, and neither condition's expected body can be inferred from the other.

---

### COND-AUTH-008: Missing userName field

| Field      | Value                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-008                                                                                                                             |
| Priority   | High                                                                                                                                      |
| Category   | Input field                                                                                                                               |
| Technique  | EP                                                                                                                                        |
| Source     | Spec: RegisterViewModel (`required: [userName, password]`); Observed behavior: docs/api-spec/account-endpoints.md (live check 2026-09-02) |
| Test cases | —                                                                                                                                         |

**What to cover**
Required-field violation: `userName` entirely absent from the request body — the key itself is missing, as distinct from being present with an empty value (COND-AUTH-010).

**Values / boundaries**

```
# EP
Invalid class — field absent: { password: "Aa1!aaaa" } (no userName key)
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Derived from the spec's `required: [userName, password]`, which establishes that omitting the field is an invalid class.

Note the swagger operation itself marks the whole body parameter `"required": false`, which contradicts `RegisterViewModel`'s own `required` array — another instance of the spec's unreliability for this endpoint. The `required` array is the more specific and more credible statement, and live behavior confirms it: the field genuinely is required.

Live-verified 2026-09-02 against `https://demoqa.com`. Neither source documents this response; the status and body come from direct observation. Same status and body as COND-AUTH-009 (missing password), COND-AUTH-010 (empty userName), and COND-AUTH-006 (empty password) — DemoQA uses one shared required-field code path (`1200`) for either field, whether absent or empty, and does not distinguish which field triggered it.

---

### COND-AUTH-009: Missing password field

| Field      | Value                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-009                                                                                                                             |
| Priority   | High                                                                                                                                      |
| Category   | Input field                                                                                                                               |
| Technique  | EP                                                                                                                                        |
| Source     | Spec: RegisterViewModel (`required: [userName, password]`); Observed behavior: docs/api-spec/account-endpoints.md (live check 2026-09-02) |
| Test cases | —                                                                                                                                         |

**What to cover**
Required-field violation: `password` entirely absent from the request body.

**Values / boundaries**

```
# EP
Invalid class — field absent: { userName: "<unique string>" } (no password key)
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Live-verified 2026-09-02 against `https://demoqa.com`. Same derivation as COND-AUTH-008 — see that condition's Notes for the shared-code-path detail and the swagger `required` contradiction.

Kept separate from COND-AUTH-008 because each required field needs its own invalid-class condition. The live pass confirmed the two do in fact share one code path and one response, but that is an observed outcome rather than a reason to merge: the conditions cover different fields, and a future fix that distinguishes them would need both cases to notice.

---

### COND-AUTH-010: Empty userName

| Field      | Value                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ID         | COND-AUTH-010                                                                                                                        |
| Priority   | Medium                                                                                                                               |
| Category   | Input field                                                                                                                          |
| Technique  | BVA                                                                                                                                  |
| Source     | Spec: RegisterViewModel (required field, type string); Observed behavior: docs/api-spec/account-endpoints.md (live check 2026-09-02) |
| Test cases | —                                                                                                                                    |

**What to cover**
Lower boundary at zero for `userName` — an empty string is a distinct case from the field being entirely absent (COND-AUTH-008).

**Values / boundaries**

```
# BVA
Empty (0 chars): userName = "", password = "Aa1!aaaa" (valid)
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Empty/null is always its own boundary, so this is not merged into COND-AUTH-008. Whether the API distinguishes an empty string from an absent key is exactly what makes both worth testing.

Live-verified 2026-09-02 against `https://demoqa.com`: it does **not** distinguish them. An empty `userName` returns the same `400` / `1200` response as the key being entirely absent. Both remain in scope — the equivalence is an observed property of the current implementation, not a guarantee, and only separate conditions would catch it changing.

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
| Test cases | —                                                     |

**What to cover**
Registering with a `userName` that already exists — created by a prior successful registration — is rejected with a conflict, distinct from any input-validation failure.

**Values / boundaries**

```
# Decision table
New unique userName + valid password        → 201, { userID, username, books: [] }
Already-registered userName + valid password → 406, { code: "1204", message: "User exists!" }
```

**Notes**
Categorised as State rather than Input field: the same input is valid or invalid depending on what already exists on the backend, so the condition is about system state, not the value itself.

Requires test-time setup — create a user, then attempt the duplicate. That setup is internal to the condition and does not create an ordering dependency on any other condition.

`code` is confirmed as the string `"1204"`, not the number swagger's `MessageModal` declares. This is one of the two live-confirmed contradictions of the swagger spec on this endpoint (the other being the `userID` casing in COND-AUTH-001).

---

## Authorization

Not applicable — this endpoint requires no prior authorization (see Endpoint analysis). No conditions in this category.

---

## Infeasible conditions

### COND-AUTH-INF-001: 404 response trigger for this endpoint (infeasible)

| Field      | Value                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-INF-001                                                                                                     |
| Priority   | Medium — an undocumented status-code path on the core registration endpoint, but no evidence it is actually reachable |
| Category   | Behavior                                                                                                              |
| Technique  | Exploratory heuristic                                                                                                 |
| Source     | Spec: swagger lists 404 among this operation's responses                                                              |
| Test cases | —                                                                                                                     |

**What to cover**
What request condition, if any, triggers a `404` from `POST /Account/v1/User`, per swagger's documented but unexplained response set.

**Why infeasible**
Neither source describes what input or state produces a `404` here. The live-verified doc's table for this endpoint lists only success, duplicate, and weak password — no 404 row. Swagger is already demonstrably unreliable for this endpoint's status codes (it omits the real `400` entirely and mislabels `code` as a number), so treating its `404` entry as evidence of a reachable path would mean inventing a scenario rather than deriving one.

**Mitigation**
Deferred until a live exploratory session surfaces a genuine `404` trigger for this endpoint, if one exists. Until then no test case should assert a `404` contract here.

---

### COND-AUTH-INF-002: userName maximum length / format boundary (infeasible)

| Field      | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| ID         | COND-AUTH-INF-002                                                        |
| Priority   | Low — peripheral boundary with no evidence any such constraint exists    |
| Category   | Input field                                                              |
| Technique  | BVA                                                                      |
| Source     | Spec: RegisterViewModel (untyped string, no format or length constraint) |
| Test cases | —                                                                        |

**What to cover**
A maximum-length or character-format boundary for `userName`, analogous to the password's documented minimum-length rule.

**Why infeasible**
Neither source documents any length or format constraint on `userName` beyond "required string." `RegisterViewModel` gives it a bare `"type": "string"` with no `maxLength`, `minLength`, or `pattern`. Asserting a boundary would mean inventing a rule present in no input to this analysis.

**Mitigation**
Deferred. If a future live-verification pass observes an actual constraint — the API rejecting a very long or oddly-formatted username — promote this to a real BVA or EP condition then.

---

### COND-AUTH-INF-003: Non-string userName or password (out of scope)

| Field      | Value                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- |
| ID         | COND-AUTH-INF-003                                                                               |
| Priority   | Low — excluded by project scope decision, not by technical infeasibility                        |
| Category   | Input field                                                                                     |
| Technique  | EP                                                                                              |
| Source     | Spec: RegisterViewModel (`userName: string`, `password: string`); scope decision: project owner |
| Test cases | —                                                                                               |

**What to cover**
Would cover the invalid equivalence class defined by _type_ rather than by value: `userName` or `password` sent as a JSON number, boolean, or null where the spec declares `string`.

**Why infeasible**
Not technically infeasible — the requests are trivially sendable with any HTTP client, and the invalid class is derivable from `RegisterViewModel`, which types both fields as `string`. Excluded per an explicit project-scope decision: a non-string field value is not reachable through any real client of this endpoint. The registration form cannot produce it, and no legitimate consumer would construct it — it requires a deliberately hand-crafted request. The scope decision is that input classes unreachable from a real client are not covered by this test plan.

Note this is a narrower exclusion than it may appear. Missing and empty-string fields are **not** excluded (COND-AUTH-006, COND-AUTH-008, COND-AUTH-009, COND-AUTH-010 remain in scope): an absent key is an ordinary client-side serialization bug, and an empty string is reachable from an unvalidated or JS-disabled form submit. Only the off-spec _type_ case is out of scope.

**Mitigation**
None planned. If the scope is revisited, this becomes a real EP condition, but only after a live probing pass establishes the actual behavior per field and per off-spec type — neither source documents whether the API rejects, coerces, or accepts such a value, and those outcomes are contract-distinct.

One consequence worth recording for whoever revisits it: this project's own `CreateUserResponseSchema` (`src/types/account.schema.ts`) declares `username: z.string()`. If the API turns out to accept a non-string username and echo it back with its original type, that response would fail this project's own schema validation. That interaction is unexamined while the condition stays out of scope.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — COND-AUTH-001 covers the valid classes of `userName` and `password` together                                                                                                          |
| Does every required input field have at least one invalid EP condition?                | Yes — `userName`: COND-AUTH-008 (absent), COND-AUTH-010 (empty); `password`: COND-AUTH-009 (absent), COND-AUTH-002–005 (complexity classes), COND-AUTH-006 (empty)                          |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes — password: COND-AUTH-006 (empty/0), COND-AUTH-007 (min-1/7), COND-AUTH-001 (min-valid/8); userName: COND-AUTH-010 (empty). No max boundary exists to cover — see COND-AUTH-INF-002     |
| Does every authorization state produce a distinct condition?                           | Not applicable — the endpoint has no authorization states                                                                                                                                   |
| Are all infeasible conditions documented?                                              | Yes — COND-AUTH-INF-001 (404 trigger), COND-AUTH-INF-002 (userName max length/format), COND-AUTH-INF-003 (non-string field types, out of scope)                                             |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                                                     |
| Are all conditions independently testable?                                             | Yes — none depends on another executing first. COND-AUTH-011 needs its own setup step, but that setup is internal to the condition, not another condition's prior execution                 |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — the happy-path trigger and its response shape are merged into COND-AUTH-001 rather than split. COND-AUTH-002–005 are separate because each is a distinct invalid class, not one effect |
| Is every condition specified at the appropriate test level?                            | COND-AUTH-002–007 are input validation, which would normally sit at component level; no such level is accessible for this SUT — see Test level rationale above                              |

**Analysis-to-condition mapping**

- Happy path (valid registration, live-confirmed response shape) → COND-AUTH-001
- Negative: duplicate userName → COND-AUTH-011
- Negative: password complexity violations (4 classes) → COND-AUTH-002, COND-AUTH-003, COND-AUTH-004, COND-AUTH-005
- Negative: missing userName / missing password → COND-AUTH-008, COND-AUTH-009
- Negative: empty userName / empty password → COND-AUTH-010, COND-AUTH-006
- Boundary: password length (0, 7, 8) → COND-AUTH-006, COND-AUTH-007, COND-AUTH-001
- Boundary: userName undocumented constraint → COND-AUTH-INF-002
- Authorization: not applicable → no condition needed
- Status codes/response shape: 201 shape → COND-AUTH-001; 406 duplicate → COND-AUTH-011; 400 weak password → COND-AUTH-002–005, COND-AUTH-007; 400 required-field violation (live-verified 2026-09-02) → COND-AUTH-006/008/009/010; undocumented 404 → COND-AUTH-INF-001
- Spec ambiguities: required-field behavior — resolved by live check 2026-09-02, see COND-AUTH-006/008/009/010; userName format undocumented → COND-AUTH-INF-002; 404 trigger undocumented → COND-AUTH-INF-001; non-string types excluded by scope decision → COND-AUTH-INF-003

**Coverage gaps identified**

- ~~Four conditions carry unverified expected results.~~ **Resolved 2026-09-02.** COND-AUTH-006, -008, -009, and -010 were written with unasserted status/body because neither source documents required-field behavior. A live verification pass against `https://demoqa.com` established all four: `400` with `{ code: "1200", message: "UserName and Password required." }`, identical across both fields and both forms of violation (absent key, empty string). A control request in the same pass confirmed a present-but-weak password still returns `1300`, so the two paths are genuinely distinct. Every condition in this file now asserts an observed result.
- The live findings from that pass were added to `docs/api-spec/account-endpoints.md` (a "Missing or empty required field" row plus a "Required-field handling" note), so the four conditions above now derive from the project's designated source of truth rather than from this file alone.
- Non-string field types are a real invalid class, excluded by a deliberate scope decision rather than left as a gap — not reachable from any real client. See COND-AUTH-INF-003.

**Deferred conditions**

- COND-AUTH-INF-001 (404 trigger) — deferred pending live exploratory observation.
- COND-AUTH-INF-002 (userName max length/format) — deferred pending live observation or a documented constraint in a future spec update.
- COND-AUTH-INF-003 (non-string field types) — excluded per project scope decision; not deferred pending further information, since the exclusion is a deliberate scope choice about client reachability rather than a documentation gap.
