# Test Conditions — DELETE /Account/v1/User/{UUID}

## Endpoint analysis

**Endpoint:** DELETE /Account/v1/User/{UUID}
**Source:** OpenAPI spec (`docs/api-spec/book-store-api.swagger.json`) cross-checked against observed live behavior (`docs/api-spec/account-endpoints.md`). Live behavior wins wherever the two disagree — and for this endpoint they disagree substantially (see Status codes table).

**Happy path**

- Valid bearer token for an existing user, deleting that same user's own UUID → the account is deleted, `204` with an empty body.

**Negative cases**

- Missing `Authorization` header entirely.
- `Authorization` header present but the token is invalid/malformed.
- Non-existent `UUID` (a syntactically plausible but never-issued user ID) with a valid, unrelated token — live-confirmed 2026-09-03, see Status codes table.

**Boundary cases**

- `UUID` path parameter: no length or format rule is documented anywhere (spec or live-verified doc) beyond it being a required string. No BVA is derivable without inventing an undocumented rule — the same gap already accepted for the same parameter in `docs/test-conditions/api/auth/get-user.md` (COND-AUTH-INF-005), which this file reuses rather than restating as a new infeasible condition.

**Authorization states**

- Valid token, own UUID → 204, empty body.
- Missing token → 401, `{code: "1200", message: "User not authorized!"}`.
- Invalid/malformed token → 401, same response as missing token (the live-verified doc groups both under a single "Missing/invalid token" row).

**Idempotency / state**

- Deleting an already-deleted user (repeating the DELETE with the now-stale token) — the state transition this endpoint uniquely owns among the `/Account` endpoints. Live-confirmed 2026-09-03: **not** idempotent, see Status codes table.

**Status codes and response shape**

| Scenario                                 | Status | Response                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                                  | 204    | Empty body — **live-confirmed**. Swagger is actively wrong here: it labels `200` as "Success" (schema `MessageModal`) and `204` as "Unauthorized" (schema `BooksResult`), which is scrambled relative to live behavior. Do not trust swagger's table for this endpoint. |
| Missing or invalid/malformed token       | 401    | `{ code: "1200", message: "User not authorized!" }` — live-confirmed; swagger documents `code` as `number`, but every endpoint sharing the `MessageModal` schema is confirmed live as a **string**                                                                      |
| Non-existent UUID, valid unrelated token | 200    | `{ code: "1207", message: "User Id not correct!" }` — **live-confirmed 2026-09-03**, undocumented in swagger. Note the `200`: an error body under a success status                                                                                                      |
| Already-deleted UUID, stale token        | 200    | `{ code: "1207", message: "User Id not correct!" }` — **live-confirmed 2026-09-03** across three independent runs; byte-identical to the row above                                                                                                                      |

**Spec ambiguities / unknowns**

- ~~A non-existent `UUID` combined with a valid, unrelated token is not documented by either spec source.~~ Resolved by live check 2026-09-03 — see COND-AUTH-020 and the status table above.
- ~~Deleting an already-deleted user is likewise unverified.~~ Resolved by live check 2026-09-03 — see COND-AUTH-021. The pre-verification concern that the token might die with its user proved unfounded: the failure is reported against the UUID (`1207`), not the credential (`1200`).
- Both resolved cases return byte-identical responses, so the API does not distinguish "never issued" from "issued then deleted". Whether that is deliberate or incidental is unknowable from the outside; the conditions assert the observed response without claiming to know which.
- No length or format constraint on the `UUID` path parameter is documented anywhere — do not invent one. Already captured as COND-AUTH-INF-005 in `get-user.md`; not duplicated here.
- Whether a malformed-but-present token produces byte-identical behavior to an absent header is not independently confirmed — the live-verified doc groups them into one row. Treated the same way as in `get-user.md` (COND-AUTH-013 / COND-AUTH-014): two conditions for two distinct invalid-input classes, despite an identical documented outcome.

---

## Authorization

### COND-AUTH-017: Valid token deletes the requesting user's own account

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-017                                         |
| Priority   | High                                                  |
| Category   | Authorization                                         |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-017                                              |

**What to cover**
The valid equivalence class: a user with a valid bearer token deletes their own UUID — resulting in `204` with an empty body. This is the sole happy path for the endpoint, and the one case where swagger's documented response table is actively misleading (it labels `204` "Unauthorized").

**Values / boundaries**

```
# EP
Valid class: a previously-created user's own UUID, deleted with that same user's valid bearer token
Expected status: 204
Expected body: empty — no JSON payload at all
```

**Notes**
Following the merge principle applied throughout this feature area (COND-AUTH-001, COND-AUTH-012): the trigger (valid token + own UUID) and its effect (204, empty body) are not independently testable, so they are one condition rather than two.

Confirming the body is genuinely empty is the substantive assertion here, not incidental — swagger claims a `BooksResult` schema for this status, so an empty-body check is what distinguishes live behavior from the documented contract.

---

### COND-AUTH-018: Missing Authorization header is rejected

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-018                                         |
| Priority   | High                                                  |
| Category   | Authorization                                         |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-018                                              |

**What to cover**
Invalid equivalence class: the request is sent with no `Authorization` header at all, against an otherwise valid, existing user's UUID. Confirms the account is protected from unauthenticated deletion.

**Values / boundaries**

```
# EP
Invalid class — header absent: request to DELETE /Account/v1/User/{validUUID} with no Authorization header
Expected status: 401
Expected body: { code: "1200", message: "User not authorized!" }
```

**Notes**
Higher stakes than the equivalent GET condition (COND-AUTH-013): an authorization gap on a destructive endpoint means unauthenticated account deletion, not merely an information leak. Priority High on that basis.

---

### COND-AUTH-019: Invalid or malformed token is rejected

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-019                                         |
| Priority   | High                                                  |
| Category   | Authorization                                         |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-019                                              |

**What to cover**
Invalid equivalence class: the `Authorization` header is present but carries a token that is not a valid, currently-issued token (e.g. a garbage string), against an otherwise valid, existing user's UUID.

**Values / boundaries**

```
# EP
Invalid class — malformed token: Authorization: Bearer not-a-real-token-abc123
Expected status: 401
Expected body: { code: "1200", message: "User not authorized!" }
```

**Notes**
Kept separate from COND-AUTH-018 rather than merged: absent-header and present-but-wrong-header are genuinely distinct invalid input classes, and the EP coverage rule requires a condition per invalid class even when the documented outcome is identical. Same treatment as COND-AUTH-013 / COND-AUTH-014 in `get-user.md`.

---

### COND-AUTH-020: Non-existent UUID returns the unknown-user error, not an authorization error

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-020                                                                |
| Priority   | Medium                                                                       |
| Category   | Authorization                                                                |
| Technique  | EP                                                                           |
| Source     | Observed behavior: live check 2026-09-03; docs/api-spec/account-endpoints.md |
| Test cases | AUTH-020                                                                     |

**What to cover**
Invalid equivalence class: a syntactically valid but never-issued UUID is deleted with a valid, unrelated token. Confirms the API reports the user as unknown (`1207`) rather than treating it as an authorization failure (`1200`), and — the substantive part — that it does so under HTTP `200`, not a 4xx.

**Values / boundaries**

```
# EP
Invalid class — non-existent UUID: a well-formed UUID that was never issued (e.g. all-zeros), deleted with any other valid token
Expected status: 200
Expected body: { code: "1207", message: "User Id not correct!" }
```

**Notes**
Promoted from COND-AUTH-INF-007 after live verification 2026-09-03, following the same precedent as COND-AUTH-INF-004 → COND-AUTH-016 in `get-user.md`.

The `200` status is the point of the condition, not incidental: a client branching on `res.ok` would read this failed deletion as a success. Asserting the status explicitly is what makes the test worth having.

Two comparisons worth keeping straight, both confirmed rather than assumed:

- Against `GET /Account/v1/User/{UUID}`, which returns `1207` as `401`/"User not found!" — same code, different status **and** different message text. Neither endpoint's pairing may be asserted against the other.
- Against COND-AUTH-021 (already-deleted user), which returns a byte-identical response. Kept as a separate condition because the two represent genuinely distinct invalid classes (never issued vs. issued then deleted), the same reasoning that keeps COND-AUTH-018 and COND-AUTH-019 separate despite their identical outcome.

---

### COND-AUTH-021: Repeat deletion of an already-deleted user is not idempotent

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-021                                                                |
| Priority   | Medium                                                                       |
| Category   | State                                                                        |
| Technique  | Exploratory heuristic                                                        |
| Source     | Observed behavior: live check 2026-09-03; docs/api-spec/account-endpoints.md |
| Test cases | AUTH-021                                                                     |

**What to cover**
The state transition unique to this endpoint: a successful DELETE, followed by a second DELETE of the same UUID using the now-stale token. Confirms the endpoint is **not** idempotent in the REST sense — the second call returns `200`/`1207` rather than repeating `204`.

**Values / boundaries**

```
# EP
Invalid class — already-deleted UUID: seed a user, delete it successfully (204), then repeat the identical request with the same token
Expected status: 200
Expected body: { code: "1207", message: "User Id not correct!" }
```

**Notes**
Promoted from COND-AUTH-INF-008 after live verification 2026-09-03 — confirmed deterministic across three independent runs with three separate users.

The pre-verification file rated this three-way ambiguous (`204` again / `1207` / `1200`, the last on the theory that the token dies with its user). The live answer is `1207`: the token remains valid enough to authenticate, and the failure is reported against the UUID, not the credential. That rules out the `1200` branch specifically — which is why this condition asserts the absence of an authorization error, not merely the presence of `1207`.

Unlike every other condition in this file, this one is inherently sequential within a single test — delete, then delete again. That is a sequence internal to the condition, not a dependency on another condition having run, so independence still holds.

---

## Infeasible conditions

None specific to this endpoint. The one applicable gap — no documented length or format constraint on the `UUID` path parameter — is already recorded as COND-AUTH-INF-005 in `get-user.md` for the same parameter and is not duplicated here. Cross-user access remains out of project scope per COND-AUTH-INF-006.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — COND-AUTH-017 covers the valid-token, own-UUID class                                                                                                                                                                                                                                                                   |
| Does every required input field have at least one invalid EP condition?                | Yes — COND-AUTH-018 (missing token), COND-AUTH-019 (invalid/malformed token), COND-AUTH-020 (non-existent UUID)                                                                                                                                                                                                              |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Not applicable — no length/format rule exists for the UUID parameter to bound; that gap is already documented as COND-AUTH-INF-005 in `get-user.md` for the same parameter and is not duplicated here                                                                                                                        |
| Does every authorization state produce a distinct condition?                           | Yes — COND-AUTH-017 (valid), COND-AUTH-018 (missing), COND-AUTH-019 (invalid), COND-AUTH-020 (valid token, unknown UUID). Cross-user access remains out of project scope per COND-AUTH-INF-006.                                                                                                                              |
| Are all infeasible conditions documented?                                              | Yes — none remain specific to this endpoint. COND-AUTH-INF-007 and COND-AUTH-INF-008 were promoted to COND-AUTH-020 and COND-AUTH-021 after live verification 2026-09-03; COND-AUTH-INF-005 covers the one remaining gap and lives in `get-user.md`                                                                          |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                                                                                                                                                                                      |
| Are all conditions independently testable?                                             | Yes — each seeds its own user and token; none depends on another having run first. COND-AUTH-017 consumes the user it seeds, which is precisely why no other condition may depend on its outcome. COND-AUTH-021 deletes twice within its own scope — a sequence internal to the condition, not a cross-condition dependency. |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — COND-AUTH-017 already merges its trigger (valid token + own UUID) with its effect (204, empty body), following the precedent in `post-user.md` and `get-user.md`. COND-AUTH-020 and COND-AUTH-021 return identical responses but are reached through different preconditions, so neither is the other's effect.         |

**Analysis-to-condition mapping**

- Happy path (valid token, own UUID, 204 empty body) → COND-AUTH-017
- Negative: missing Authorization header → COND-AUTH-018
- Negative: invalid/malformed token → COND-AUTH-019
- Negative: non-existent UUID with a valid token → COND-AUTH-020
- Boundary: UUID undocumented length/format constraint → COND-AUTH-INF-005 in `get-user.md` (same parameter, not duplicated)
- Idempotency/state: deleting an already-deleted user → COND-AUTH-021
- Authorization states: valid/missing/invalid/unknown-UUID → COND-AUTH-017, COND-AUTH-018, COND-AUTH-019, COND-AUTH-020
- Status codes/response shape: 204 empty body, 401 shared auth error, 200 shared `1207` unknown-user error → COND-AUTH-017, COND-AUTH-018, COND-AUTH-019, COND-AUTH-020, COND-AUTH-021
- Spec ambiguities: non-existent UUID resolved 2026-09-03 → COND-AUTH-020; already-deleted user resolved 2026-09-03 → COND-AUTH-021; UUID format → COND-AUTH-INF-005 (`get-user.md`); missing-vs-invalid-token distinction → addressed in COND-AUTH-019's Notes

**Coverage gaps identified**

- None. The two previously-deferred behaviors were live-verified 2026-09-03 and promoted to COND-AUTH-020 and COND-AUTH-021; `docs/api-spec/account-endpoints.md` was updated in the same pass so the project's source of truth now carries them.

**Deferred conditions**

- None for this endpoint. COND-AUTH-INF-005 (UUID format/length) remains deferred but is owned by `get-user.md`, which covers the same parameter.
