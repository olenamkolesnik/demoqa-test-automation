# Test Conditions — GET /Account/v1/User/{UUID}

## Endpoint analysis

**Endpoint:** GET /Account/v1/User/{UUID}
**Source:** OpenAPI spec (`docs/api-spec/book-store-api.swagger.json`) cross-checked against observed live behavior (`docs/api-spec/account-endpoints.md`). Live behavior wins wherever the two disagree.

**Happy path**

- Valid bearer token for an existing user, requesting that same user's own UUID → the user's profile is returned.

**Negative cases**

- Missing `Authorization` header entirely.
- `Authorization` header present but the token is invalid/malformed.
- Valid token belonging to a different user than the one identified by the `UUID` path parameter (cross-user access) — live-confirmed 2026-08-26, see Status codes table.
- Non-existent `UUID` (a syntactically plausible but never-issued user ID) with a valid, unrelated token — live-confirmed 2026-08-26, see Status codes table.

**Boundary cases**

- `UUID` path parameter: no length or format rule is documented anywhere (spec, live-verified doc) beyond it being a required string. No BVA is derivable without inventing an undocumented rule — see Spec ambiguities below. This mirrors the same gap already accepted for `userName` in `docs/test-conditions/api/auth/post-user.md` (COND-AUTH-INF-002).

**Authorization states**

- Valid token, own UUID → 200, profile returned.
- Missing token → 401, `{code: "1200", message: "User not authorized!"}`.
- Invalid/malformed token → 401, same response as missing token (not distinguished by the live-verified doc — both are grouped under "Missing/invalid token" in a single documented row).
- Valid token, different user's UUID (cross-user access) → live-confirmed 2026-08-26: 401, `{code: "1200", message: "User not authorized!"}` — identical to the missing/invalid-token response; the API enforces per-user ownership but does not surface a distinct error for it.
- Valid, unrelated token, non-existent UUID → live-confirmed 2026-08-26: 401, `{code: "1207", message: "User not found!"}` — a genuinely distinct response from the "not authorized" case, even though both are HTTP 401.

**Status codes and response shape**

| Scenario                                               | Status | Response                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Success                                                | 200    | `{ userId: string, username: string, books: [] }` — **live-confirmed `userId`, lowercase d**; swagger's `GetUserResult` definition already agrees with this casing for this specific endpoint (unlike the POST /Account/v1/User endpoint, where swagger's casing is wrong)                                               |
| Missing or invalid/malformed token                     | 401    | `{ code: "1200", message: "User not authorized!" }` — live-confirmed; swagger documents `code` as `number`, but every other endpoint sharing the `MessageModal` schema is confirmed live as a **string** — treat swagger's `number` type as unreliable here too unless independently reconfirmed for this exact endpoint |
| Valid token, different user's UUID (cross-user access) | 401    | `{ code: "1200", message: "User not authorized!" }` — **live-confirmed 2026-08-26**; identical to the missing/invalid-token response, confirming the API enforces per-user ownership without a distinct error code for it                                                                                                |
| Valid, unrelated token, non-existent UUID              | 401    | `{ code: "1207", message: "User not found!" }` — **live-confirmed 2026-08-26**; distinct from the "not authorized" response, and reuses the same `1207`/"User not found!" pair already confirmed for `POST /Account/v1/Authorized`'s wrong-password case (see `docs/api-spec/account-endpoints.md`)                      |

**Spec ambiguities / unknowns**

- ~~Cross-user access (a valid, correctly-authenticated token used to request a _different_ user's UUID) is not documented by either the swagger spec or the live-verified doc.~~ Resolved by live check 2026-08-26 — see COND-AUTH-015 and the status table above. (Note: an earlier draft of this project's test plan explicitly scoped cross-user access out of the project; the current test plan no longer states this exclusion. The behavior is now confirmed regardless, but the project's own scope decision on whether this is a supported/intended contract, or merely observed incidental behavior, is a separate question — see Coverage completeness check.)
- ~~A non-existent `UUID` (well-formed but never issued) combined with a valid, unrelated token is not documented by either spec source.~~ Resolved by live check 2026-08-26 — see COND-AUTH-016 and the status table above.
- No length or format constraint on the `UUID` path parameter is documented anywhere — do not invent one; see Boundary cases above.
- The live-verified doc groups "missing" and "invalid" token under one documented row (`401`, same message) — it is not confirmed whether a malformed-but-present token (e.g. garbage string) actually produces byte-identical behavior to a header that is absent altogether, or merely the same status code with some other difference. Treated as a single condition per the doc's own grouping, since no evidence suggests a different treatment.

---

## Authorization

### COND-AUTH-012: Valid token retrieves the requesting user's own profile with the live-confirmed response shape

| Field      | Value                                                                      |
| ---------- | -------------------------------------------------------------------------- |
| ID         | COND-AUTH-012                                                              |
| Priority   | High                                                                       |
| Category   | Authorization                                                              |
| Technique  | EP                                                                         |
| Source     | Spec: GetUserResult; Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-012                                                                   |

**What to cover**
The valid equivalence class: a user with a valid bearer token requests their own UUID and receives their profile — resulting in `200` with the live-confirmed response shape `{ userId, username, books: [] }`. Specifically confirms the lowercase `userId` casing, distinguishing it from the capital-`ID` casing confirmed for `POST /Account/v1/User`'s response.

**Values / boundaries**

```
# EP
Valid class: a previously-created user's own UUID, requested with that same user's valid bearer token
Expected status: 200
Body keys present: userId (lowercase d), username, books (empty array)
Body key absent: userID (capital ID) must NOT be the key used — distinguishes this endpoint's live casing from POST /Account/v1/User's casing
```

**Notes**
This is the sole happy-path condition for this endpoint. Following the same merge principle already applied in `post-user.md` (COND-AUTH-001): the trigger (valid token + own UUID) and its effect (200 with the correct casing) are not independently testable, so they are kept as one condition rather than split.

---

### COND-AUTH-013: Missing Authorization header is rejected

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-013                                         |
| Priority   | High                                                  |
| Category   | Authorization                                         |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-013                                              |

**What to cover**
Invalid equivalence class: the request is sent with no `Authorization` header at all, against an otherwise valid, existing user's UUID.

**Values / boundaries**

```
# EP
Invalid class — header absent: request to GET /Account/v1/User/{validUUID} with no Authorization header
Expected status: 401
Expected body: { code: "1200", message: "User not authorized!" }
```

**Notes**
—

---

### COND-AUTH-014: Invalid or malformed token is rejected

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-014                                         |
| Priority   | High                                                  |
| Category   | Authorization                                         |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-014                                              |

**What to cover**
Invalid equivalence class: the `Authorization` header is present but carries a token that is not a valid, currently-issued token (e.g. a garbage string, or a token from a deleted user), against an otherwise valid, existing user's UUID.

**Values / boundaries**

```
# EP
Invalid class — malformed token: Authorization: Bearer not-a-real-token-abc123
Expected status: 401
Expected body: { code: "1200", message: "User not authorized!" }
```

**Notes**
The live-verified doc documents "missing" and "invalid" token under a single combined row with an identical response — this condition and COND-AUTH-013 are kept as two separate conditions (not merged) because they represent genuinely distinct invalid-input classes (absent header vs. present-but-wrong header) even though the documented outcome happens to be identical, consistent with the EP rule to have at least one condition per invalid equivalence class.

---

### COND-AUTH-015: Cross-user access with a valid token is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-AUTH-015                            |
| Priority   | Medium                                   |
| Category   | Authorization                            |
| Technique  | Exploratory heuristic                    |
| Source     | Observed behavior: live check 2026-08-26 |
| Test cases | AUTH-015                                 |

**What to cover**
Invalid equivalence class: a valid, correctly-authenticated bearer token for User A is used to request User B's UUID. Confirms the API enforces per-user ownership rather than granting access to any UUID for any valid token.

**Values / boundaries**

```
# EP
Invalid class — cross-user access: User A's valid token, User B's UUID (two distinct previously-created users)
Expected status: 401
Expected body: { code: "1200", message: "User not authorized!" }
```

**Notes**
Live-confirmed 2026-08-26 against https://demoqa.com. Promoted from COND-AUTH-INF-003 after live verification. The response is identical to COND-AUTH-013/014 (missing/invalid token) — the API does not distinguish "wrong owner" from "no valid credential at all," both surface as the same generic `1200` error. This was previously deferred pending a live check or an explicit test-plan scope decision on cross-user access; the live check has now resolved the _behavior_ question. Whether this observed behavior is treated as an intended, guaranteed contract (worth a regression test) or merely incidental behavior (not guaranteed to remain stable) is a separate, unresolved scope question — see Coverage completeness check.

---

### COND-AUTH-016: Non-existent UUID with a valid, unrelated token returns a distinct "not found" error

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-AUTH-016                            |
| Priority   | Low                                      |
| Category   | Authorization                            |
| Technique  | Exploratory heuristic                    |
| Source     | Observed behavior: live check 2026-08-26 |
| Test cases | AUTH-016                                 |

**What to cover**
Invalid equivalence class: a syntactically valid but never-issued UUID is requested with a valid, unrelated token. Confirms this returns a distinct "user not found" error rather than being indistinguishable from an authorization failure.

**Values / boundaries**

```
# EP
Invalid class — non-existent UUID: a well-formed UUID that was never issued (e.g. all-zeros), requested with any other valid token
Expected status: 401
Expected body: { code: "1207", message: "User not found!" }
```

**Notes**
Live-confirmed 2026-08-26 against https://demoqa.com. Promoted from COND-AUTH-INF-004 after live verification. Both the status (401) and the specific error code (1207) were confirmed — this is genuinely distinct from COND-AUTH-013/014/015's shared `1200` response, despite sharing the same HTTP status. The `1207`/"User not found!" pair matches the code already confirmed for `POST /Account/v1/Authorized`'s wrong-password case in `docs/api-spec/account-endpoints.md`, suggesting `1207` is this API's general "no such user" code, reused across endpoints.

---

## Infeasible conditions

### COND-AUTH-INF-005: UUID maximum length / format boundary (infeasible)

| Field      | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| ID         | COND-AUTH-INF-005                                                        |
| Priority   | Low — peripheral boundary with no evidence any such constraint exists    |
| Category   | Input field                                                              |
| Technique  | BVA                                                                      |
| Source     | Spec: path parameter (untyped string, no format/length constraint given) |
| Test cases | —                                                                        |

**What to cover**
A length or character-format boundary for the `UUID` path parameter (e.g. a malformed non-UUID string, or an extremely long value).

**Why infeasible**
No source (swagger or the live-verified doc) documents any length or format constraint on the `UUID` parameter beyond "required string." Asserting a boundary here would mean inventing a rule not present in either input. This mirrors the same gap already accepted for `userName` in `docs/test-conditions/api/auth/post-user.md` (COND-AUTH-INF-002).

**Mitigation**
Deferred. If a future live-verification pass observes an actual constraint (e.g. the API rejects a non-UUID-shaped string with a distinct status code), promote this to a real BVA or EP condition at that point.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                          |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — COND-AUTH-012 covers the valid-token, own-UUID class                                                                                                                      |
| Does every required input field have at least one invalid EP condition?                | Yes — COND-AUTH-013 (missing token), COND-AUTH-014 (invalid/malformed token)                                                                                                    |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Not applicable — no length/format rule exists for the UUID parameter to bound; the absence of such a rule is itself documented as COND-AUTH-INF-005                             |
| Does every authorization state produce a distinct condition?                           | Yes — COND-AUTH-012 (valid), COND-AUTH-013 (missing), COND-AUTH-014 (invalid), COND-AUTH-015 (cross-user access), COND-AUTH-016 (non-existent UUID)                             |
| Are all infeasible conditions documented?                                              | Yes — COND-AUTH-INF-005 (UUID format/length). COND-AUTH-INF-003/004 were promoted to COND-AUTH-015/016 after live verification 2026-08-26 and are no longer infeasible.         |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                                         |
| Are all conditions independently testable?                                             | Yes — no condition depends on another executing first or in a specific order; each requires its own seeded user/token but not another condition's prior execution               |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — COND-AUTH-012 already merges its own trigger (valid token + own UUID) and effect (200 with correct casing) into one condition, following the precedent set in post-user.md |

**Analysis-to-condition mapping**

- Happy path (valid token, own UUID, live-confirmed response shape) → COND-AUTH-012
- Negative: missing Authorization header → COND-AUTH-013
- Negative: invalid/malformed token → COND-AUTH-014
- Negative: cross-user access with a valid token → COND-AUTH-015
- Negative: non-existent UUID with a valid token → COND-AUTH-016
- Boundary: UUID undocumented length/format constraint → COND-AUTH-INF-005
- Authorization states: valid/missing/invalid/cross-user/non-existent-UUID → COND-AUTH-012, COND-AUTH-013, COND-AUTH-014, COND-AUTH-015, COND-AUTH-016
- Status codes/response shape: 200 shape, 401 shared error (missing/invalid/cross-user), 401 distinct "not found" error (non-existent UUID) → COND-AUTH-012, COND-AUTH-013, COND-AUTH-014, COND-AUTH-015, COND-AUTH-016
- Spec ambiguities: cross-user access resolved 2026-08-26 → COND-AUTH-015; non-existent UUID resolved 2026-08-26 → COND-AUTH-016; UUID format undocumented → COND-AUTH-INF-005; missing-vs-invalid-token distinction unconfirmed → addressed directly in COND-AUTH-014's Notes

**Coverage gaps identified**

- None beyond what is already captured as the one remaining infeasible condition (UUID format/length).
- The project's own scope decision on cross-user access is still unresolved at the project-management level, independent of the now-confirmed API behavior: is COND-AUTH-015's observed rejection an intended, guaranteed contract worth a permanent regression test, or merely incidental behavior of the current implementation? This should be resolved with the test plan owner; it does not block writing a test case against the currently-observed behavior, but does affect how much weight that test case's failure should carry if the behavior ever changes.

**Deferred conditions**

- COND-AUTH-INF-005 (UUID format/length) — deferred pending live exploratory observation or a documented constraint appearing in a future spec update.
