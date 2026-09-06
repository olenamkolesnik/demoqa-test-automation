# Test Conditions — DELETE /BookStore/v1/Books

## Endpoint analysis

**Endpoint:** DELETE /BookStore/v1/Books
**Source:** `docs/api-spec/book-store-endpoints.md` (live-verified), extended by live check 2026-09-06. Live behavior wins over Swagger wherever the two disagree.

**What this endpoint does**

Empties a user's entire book collection in one call. It takes a bearer token identifying the caller and a `UserId` **query parameter** naming the target user — there is no request body. Success is `204` with an empty body; Swagger's claim of a `BooksResult` payload is wrong.

Three behaviors established by the 2026-09-06 live check shape the conditions below, each reproduced on two independent `qa_`-prefixed users:

1. **It is idempotent.** Deleting an already-empty collection returns `204`, and so does repeating a delete that already succeeded. This is the _opposite_ of `DELETE /Account/v1/User/{UUID}`, which returns `200`/`1207` on a repeat (COND-AUTH-021 in `delete-user.md`). The `/Account` precedent must not be carried across.
2. **An absent `UserId` is handled, not fatal.** Omitting the query parameter entirely returns `401`/`1207`, byte-identical to an empty or unknown value. This diverges from `POST /BookStore/v1/Books`, where an absent required key returns `500` with a stack trace (COND-POST-BOOKS-004/005). Absent, empty, and unknown collapse into one response here, so they are separate invalid _classes_ but share an expected outcome.
3. **Cross-user deletes are refused in both directions.** Token A naming user B's `UserId` returns `401`/`1200` and leaves B's collection intact — verified A→B and B→A.

**Happy path**

- Valid token, own `UserId`, collection holding books → `204` with an empty body, and the collection is empty afterwards.

**Negative cases**

- `UserId` query parameter absent entirely → `401`/`1207`.
- `UserId` present but an empty string → `401`/`1207`.
- `UserId` well-formed but belonging to no user → `401`/`1207`.
- No `Authorization` header → `401`/`1200`.
- Malformed/garbage token → `401`/`1200`.
- Valid token for user A naming user B's `UserId` → `401`/`1200`, B's collection unchanged.

**Boundary cases**

- Collection size: 0 books (already empty) is the lower boundary and succeeds rather than erroring; ≥1 book is the populated class. No upper bound is meaningful — the call removes everything regardless of size, so there is no "one item beyond the maximum" to probe.
- `UserId`: empty string (0 chars) is the zero-length boundary of a required string. No length or format rule is documented for the UUID beyond it being a required string — the same gap already accepted in `docs/test-conditions/api/auth/get-user.md` (COND-AUTH-INF-005), reused here rather than restated. That citation carries the identifier's **format/length gap only**: COND-AUTH-INF-005 describes a path parameter on `/Account/v1/User/{UUID}`, whereas `UserId` here is a query parameter, so nothing about parameter-location-specific handling transfers with it.

**Idempotency / state**

- Delete on a populated collection, then repeat the identical call → `204` both times. The endpoint is idempotent in the REST sense, unlike its `/Account` counterpart.

**Authorization states**

- Valid token, caller's own `UserId` → `204`.
- No `Authorization` header → `401`/`1200`.
- Malformed/garbage token → `401`/`1200`, same response as absent.
- Valid token for user A, `UserId` of user B → `401`/`1200` — live-verified 2026-09-06, both directions.

**Status codes and response shape**

| Scenario                                  | Status | Response                                                                           |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Success, collection had books             | `204`  | Empty body — Swagger's `BooksResult` schema is wrong                               |
| Success, collection already empty         | `204`  | Empty body — **live-verified 2026-09-06**; idempotent, not an error                |
| Repeat delete after a successful delete   | `204`  | Empty body — **live-verified 2026-09-06**                                          |
| Missing, malformed, or other user's token | `401`  | `{ code: "1200", message: "User not authorized!" }`                                |
| `UserId` absent, empty, or unknown        | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-06** |

**Spec ambiguities / unknowns**

- ~~Whether deleting an already-empty collection, or repeating a successful delete, errors or succeeds.~~ Resolved by live check 2026-09-06 — both `204`. `docs/api-spec/book-store-endpoints.md` was corrected in the same pass and its provenance header amended.
- ~~What an absent, empty, or unknown `UserId` returns.~~ Resolved by the same check — all three `401`/`1207`, no `500` crash.
- ~~Whether a token belonging to a different user can empty another user's collection.~~ Resolved — it cannot, `401`/`1200`, verified in both directions.
- Whether an expired token behaves identically to a malformed one is untestable within a suite run — the same gap accepted across the `/Account` files and in `post-books.md`; see COND-DELETE-BOOKS-INF-001.
- No length or format constraint on the `UserId` value is documented — already captured as COND-AUTH-INF-005 in `get-user.md` for the same identifier; not duplicated here. The reuse covers the identifier's format/length rule only, not parameter-location behavior: that condition concerns a path parameter, this one a query parameter.
- Swagger documents `MessageModal.code` as `number`; every endpoint sharing that schema returns a **string** live, re-confirmed here for `1200` and `1207`.

---

## Input field

### COND-DELETE-BOOKS-001: Absent UserId query parameter is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-DELETE-BOOKS-001                    |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | DELETE-BOOKS-004                         |

**What to cover**
The invalid class where the required `UserId` query parameter is omitted from the URL entirely: the request is validated and refused with `401`/`1207`, **not** crashed into a `500` the way `POST /BookStore/v1/Books` handles an absent required key.

**Values / boundaries**

```
# EP — invalid class: parameter absent
URL: DELETE /BookStore/v1/Books        # no ?UserId= at all
Headers: valid Authorization: Bearer <own token>
Expected: 401; { code: "1207", message: "User Id not correct!" }
Not: 500, and not an HTML stack-trace page
```

**Notes**
Undocumented before the 2026-09-06 live check; reproduced on two users. The "not 500" half is the substantive part — the sibling POST endpoint's absent-key behavior would predict a crash, and this condition records that the prediction is wrong. Assert status, code, **and** message together; `1207` is overloaded across this resource.

Needs a raw request rather than the typed client, since the client signature makes `userId` mandatory — the same precedent as COND-POST-BOOKS-004/005.

---

### COND-DELETE-BOOKS-002: Empty-string UserId is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-DELETE-BOOKS-002                    |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | DELETE-BOOKS-005                         |

**What to cover**
The zero-length boundary of the required `UserId` parameter: present in the query string but holding no value, rejected with `401`/`1207`.

**Values / boundaries**

```
# BVA — string length, empty
URL: DELETE /BookStore/v1/Books?UserId=
Headers: valid Authorization: Bearer <own token>
Expected: 401; { code: "1207", message: "User Id not correct!" }
```

**Notes**
Kept separate from COND-DELETE-BOOKS-001 despite the identical response: absent and empty are distinct classes, and on the sibling POST endpoint they genuinely diverge — recording that they _don't_ diverge here is the point.

---

### COND-DELETE-BOOKS-003: Well-formed but unknown UserId is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-DELETE-BOOKS-003                    |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | DELETE-BOOKS-006                         |

**What to cover**
The invalid class where `UserId` is a syntactically valid UUID belonging to no user: rejected with `401`/`1207`, byte-identical to the absent and empty cases.

**Values / boundaries**

```
# EP — invalid class: unknown-but-well-formed identifier
URL: DELETE /BookStore/v1/Books?UserId=11111111-2222-3333-4444-555555555555
Headers: valid Authorization: Bearer <own token>
Expected: 401; { code: "1207", message: "User Id not correct!" }
```

**Notes**
Kept separate from COND-DELETE-BOOKS-001/002 despite the identical response, following the same precedent as COND-AUTH-013/014 in `get-user.md` and COND-POST-BOOKS-006/007: distinct invalid classes get distinct conditions even when the SUT collapses them.

---

## State

### COND-DELETE-BOOKS-004: Valid token empties the caller's own populated collection

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| ID         | COND-DELETE-BOOKS-004                                                |
| Priority   | High                                                                 |
| Category   | State                                                                |
| Technique  | EP                                                                   |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md`; live check 2026-09-06 |
| Test cases | DELETE-BOOKS-001                                                     |

**What to cover**
The core valid class: an authenticated user with books in their collection deletes with their own `UserId`. The response is `204` with a genuinely empty body, and the collection is empty afterwards — every book removed, not merely the first.

**Values / boundaries**

```
# EP — valid class
Setup: seed the caller's collection with two ISBNs
        [{ isbn: "9781449325862" }, { isbn: "9781449331818" }]
URL: DELETE /BookStore/v1/Books?UserId=<own UUID>
Expected: 204; body empty — no JSON payload at all
Verify persistence: GET /Account/v1/User/{UUID} → books === []
```

**Notes**
Seeding two books rather than one is deliberate: it is what distinguishes "removes the whole collection" from "removes one book", which is the neighbouring `DELETE /BookStore/v1/Book` endpoint's job.

Confirming the body is genuinely empty is substantive, not incidental — Swagger claims a `BooksResult` schema for this status, so the empty-body check is what separates live behavior from the documented contract. Same rationale as COND-AUTH-017 in `delete-user.md`.

Merging the read-back into this condition rather than splitting it out follows the no-trigger/effect-splitting rule: one request exercises both.

---

### COND-DELETE-BOOKS-005: Deleting an already-empty collection succeeds

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-DELETE-BOOKS-005                    |
| Priority   | Medium                                   |
| Category   | State                                    |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | DELETE-BOOKS-002                         |

**What to cover**
The zero-item boundary of the collection: a freshly registered user whose collection has never held a book deletes anyway, and the call succeeds with `204` rather than reporting nothing-to-delete as an error.

**Values / boundaries**

```
# BVA — collection size, lower boundary
Setup: a newly registered user, collection [] (no books ever added)
URL: DELETE /BookStore/v1/Books?UserId=<own UUID>
Expected: 204; body empty
Not: 400, and not a 1207/1205-style error body
```

**Notes**
Undocumented before the 2026-09-06 live check; reproduced on two users. Independently testable — it seeds its own empty user and does not depend on COND-DELETE-BOOKS-004 having run.

---

### COND-DELETE-BOOKS-006: Repeating a successful delete is idempotent

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-DELETE-BOOKS-006                    |
| Priority   | Medium                                   |
| Category   | State                                    |
| Technique  | Exploratory heuristic                    |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | DELETE-BOOKS-003                         |

**What to cover**
The state transition this endpoint owns: a successful delete on a populated collection, followed immediately by the identical request with the same token. The second call also returns `204` — the endpoint is idempotent in the REST sense.

**Values / boundaries**

```
# Exploratory — idempotency
Setup: seed the caller's collection with [{ isbn: "9781449325862" }]
Call 1: DELETE /BookStore/v1/Books?UserId=<own UUID> → 204, empty body
Call 2: identical request, same token         → 204, empty body
Not: 200 with { code: "1207", ... }, which is what DELETE /Account/v1/User returns on a repeat
```

**Notes**
The "not `200`/`1207`" half is why this condition exists rather than being folded into COND-DELETE-BOOKS-005. The nearest precedent in this repo — COND-AUTH-021 in `delete-user.md` — establishes that a repeat delete on `/Account` is _not_ idempotent, so the reasonable prior was that this endpoint would match. It does not. Pinning the divergence stops a future reader from generalising the `/Account` behavior across the API.

Distinct from COND-DELETE-BOOKS-005 in precondition: 005 never had books, 006 had books that this test removed. Both reach `204`, but through different states — the same reasoning that keeps COND-AUTH-020 and COND-AUTH-021 separate.

Sequential within its own scope (delete, then delete again), which is a sequence internal to the condition, not a dependency on another condition having run.

---

## Authorization

### COND-DELETE-BOOKS-007: Request without an Authorization header is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-DELETE-BOOKS-007                         |
| Priority   | High                                          |
| Category   | Authorization                                 |
| Technique  | EP                                            |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | DELETE-BOOKS-007                              |

**What to cover**
An otherwise entirely valid request sent with no `Authorization` header is refused with `401`/`1200`, and the collection is left intact.

**Values / boundaries**

```
# EP — invalid class: no credentials
Setup: seed the target user's collection with [{ isbn: "9781449325862" }]
URL: DELETE /BookStore/v1/Books?UserId=<valid UUID>
Headers: (no Authorization)
Expected: 401; { code: "1200", message: "User not authorized!" }
Verify: the collection still contains 9781449325862
```

**Notes**
Priority High on the same basis as COND-AUTH-018: an authorization gap on a destructive endpoint means unauthenticated data loss, not merely an information leak. The intact-collection assertion is what makes that meaningful — a `401` that still emptied the collection would be the real defect.

---

### COND-DELETE-BOOKS-008: Request with a malformed token is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-DELETE-BOOKS-008                         |
| Priority   | Medium                                        |
| Category   | Authorization                                 |
| Technique  | EP                                            |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | DELETE-BOOKS-008                              |

**What to cover**
A present but syntactically invalid bearer token is refused with `401`/`1200`, identically to an absent header.

**Values / boundaries**

```
# EP — invalid class: malformed credentials
URL: DELETE /BookStore/v1/Books?UserId=<valid UUID>
Headers: Authorization: Bearer not-a-real-token
Expected: 401; { code: "1200", message: "User not authorized!" }
```

**Notes**
Kept separate from COND-DELETE-BOOKS-007 despite the identical response — same precedent as COND-AUTH-013/014 in `get-user.md` and COND-POST-BOOKS-011/012.

---

### COND-DELETE-BOOKS-009: A user's token cannot empty another user's collection

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-DELETE-BOOKS-009                    |
| Priority   | High                                     |
| Category   | Authorization                            |
| Technique  | Decision table                           |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | DELETE-BOOKS-009                         |

**What to cover**
The cross-user authorization boundary: user A holds a valid token but names user B's `UserId` in the query string. The request is refused with `401`/`1200` and B's collection is left intact — the token's owner must match the named `UserId`.

**Values / boundaries**

```
# Decision table — token owner vs. query UserId
token(A) + UserId(A) → 204    # baseline (see COND-DELETE-BOOKS-004), not re-tested here
token(A) + UserId(B) → 401, { code: "1200", message: "User not authorized!" }
Setup: two independent registered users; B's collection seeded with
       [{ isbn: "9781449325862" }]
Expected: user B's collection still contains 9781449325862 afterwards
```

**Notes**
High priority — this is the condition that would catch a genuine privilege-escalation regression, not merely a validation slip, and on this endpoint the escalation destroys data rather than reading it. Live-verified 2026-09-06 in both directions (A→B and B→A). Undocumented in Swagger and absent from the spec doc before that check.

The intact-collection assertion is load-bearing for the same reason as in COND-DELETE-BOOKS-007: the status code alone would not catch a delete that happened anyway.

---

## Infeasible conditions

### COND-DELETE-BOOKS-INF-001: Expired token behavior (infeasible)

| Field      | Value                     |
| ---------- | ------------------------- |
| ID         | COND-DELETE-BOOKS-INF-001 |
| Priority   | Medium                    |
| Category   | Authorization             |
| Technique  | EP                        |
| Source     | Spec gap                  |
| Test cases | —                         |

**What to cover**
Whether a token that was valid and has since expired is refused identically to a malformed one (`401`/`1200`), or produces a distinct response.

**Why infeasible**
Token lifetime is not documented and cannot be controlled from the client. Reaching the expired state needs a wait of unknown, likely multi-hour duration inside a suite run.

**Mitigation**
The same gap is already accepted in `docs/test-conditions/api/auth/post-authorized.md`, `post-generate-token.md`, and `post-books.md` (COND-POST-BOOKS-INF-002). Malformed-token handling (COND-DELETE-BOOKS-008) covers the nearest reachable invalid-credential class.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Does every required input field have a valid EP condition?                             | Yes — `UserId` via COND-DELETE-BOOKS-004                                                                                                                                                                           |
| Does every required input field have at least one invalid EP condition?                | Yes — `UserId`: 001 (absent), 002 (empty), 003 (unknown)                                                                                                                                                           |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes — collection size: 0 (005), ≥1 (004); `UserId`: empty (002). No meaningful upper bound exists (the call removes everything regardless of size). Format gap: COND-AUTH-INF-005 in `get-user.md`                 |
| Does every authorization state produce a distinct condition?                           | Yes — valid (004), absent (007), malformed (008), other user's (009); expired deferred as INF-001                                                                                                                  |
| Are all infeasible conditions documented?                                              | Yes — INF-001                                                                                                                                                                                                      |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                                                                            |
| Are all conditions independently testable?                                             | Yes — each seeds its own user and collection state; 005 seeds an empty user rather than depending on 004, and 006 deletes twice within its own scope                                                               |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — the `204`-empty-body and collection-emptied assertions are folded into 004 rather than split, per the merge rule. 005/006 both reach `204` but from different preconditions, so neither is the other's effect |

**Analysis-to-condition mapping**

- Happy path (valid token, own `UserId`, populated collection → 204, collection emptied) → COND-DELETE-BOOKS-004
- Negative: `UserId` absent → COND-DELETE-BOOKS-001
- Negative: `UserId` empty → COND-DELETE-BOOKS-002
- Negative: `UserId` unknown → COND-DELETE-BOOKS-003
- Negative: no `Authorization` header → COND-DELETE-BOOKS-007
- Negative: malformed token → COND-DELETE-BOOKS-008
- Negative: cross-user delete → COND-DELETE-BOOKS-009
- Boundary: collection size 0 → COND-DELETE-BOOKS-005; size ≥1 → COND-DELETE-BOOKS-004
- Boundary: `UserId` zero-length → COND-DELETE-BOOKS-002; format/length gap → COND-AUTH-INF-005 in `get-user.md` (same identifier, not duplicated — format/length only; that condition covers a path parameter, this a query parameter)
- Idempotency/state: repeat delete → COND-DELETE-BOOKS-006
- Authorization states: valid/absent/malformed/cross-user → 004, 007, 008, 009; expired → INF-001
- Status codes/response shape: `204` empty body → 004, 005, 006; `401`/`1200` → 007, 008, 009; `401`/`1207` → 001, 002, 003
- Spec ambiguities: idempotency resolved 2026-09-06 → 005, 006; `UserId` handling resolved → 001, 002, 003; cross-user resolved → 009; expired token → INF-001

**Coverage gaps identified**

- Expired-token handling — deferred as COND-DELETE-BOOKS-INF-001.
- `UserId` string-shape validation (length, format) is not covered: no rule is documented for the identifier, a gap owned by COND-AUTH-INF-005 in `get-user.md` — cited for the format/length rule only, since that condition covers a path parameter and this one a query parameter.

**Deferred conditions**

- COND-DELETE-BOOKS-INF-001 — above.
