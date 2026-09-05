# Test Conditions — POST /BookStore/v1/Books

## Endpoint analysis

**Endpoint:** POST /BookStore/v1/Books
**Source:** `docs/api-spec/book-store-endpoints.md` (live-verified), extended by live check 2026-09-05. Live behavior wins over Swagger wherever the two disagree.

**What this endpoint does**

Adds one or more books, identified by ISBN, to an existing user's collection. It takes a bearer token identifying the caller and a body naming the target `userId` plus a `collectionOfIsbns` array. Success is `201` with `{ books: [{ isbn }] }` echoing the submitted ISBNs — an object, not the bare array Swagger claims.

Three behaviors established by the 2026-09-05 live check shape the conditions below, each reproduced on two independent `qa_`-prefixed users:

1. **Absent keys crash the server.** Omitting `userId` or `collectionOfIsbns` entirely returns `500` with an HTML stack-trace page, not a validated `400`. A present-but-empty value for either field _is_ handled. This is the only place on this resource where an absent key and an empty value diverge, so they are separate invalid classes here rather than the single class used in `/Account` conditions files.
2. **A partial batch silently lies.** A batch of one valid plus one unknown ISBN returns `201` and echoes **both** back, yet only the valid one is persisted. An unknown ISBN yields `400`/`1205` only when it is the sole item. The `201` body cannot be trusted as a record of what was stored — verifying a write means reading the collection back.
3. **`1207` is overloaded.** It appears twice on this endpoint under different statuses and messages (`400`/"Collection of books required." and `401`/"User Id not correct!"), and again elsewhere in the API with different text. Code alone identifies nothing here.

**Happy path**

- Valid token, own `userId`, one valid unowned ISBN → `201` with `{ books: [{ isbn }] }`, and the book is present in the user's collection afterwards.
- Valid token, own `userId`, multiple valid unowned ISBNs in one call → `201` echoing every submitted ISBN, all persisted.

**Negative cases**

- ISBN not in the catalogue, as the only item in the batch → `400`/`1205`.
- ISBN already present in the caller's collection → `400`/`1210`.
- `collectionOfIsbns` present but empty → `400`/`1207`, "Collection of books required."
- `userId` present but empty string → `401`/`1207`, "User Id not correct!".
- `userId` well-formed but belonging to no user → `401`/`1207`, same response.
- `userId` key absent from the body → `500`, HTML stack trace.
- `collectionOfIsbns` key absent from the body → `500`, HTML stack trace.
- Batch mixing a valid and an unknown ISBN → `201` echoing both, only the valid one stored.

**Boundary cases**

- `collectionOfIsbns` array length: empty (0 items) is the lower boundary and is rejected; 1 item is the minimum valid; 2 items covers the "many" class. No documented upper bound exists, so none is invented — see COND-POST-BOOKS-INF-001.
- `userId`: empty string (0 chars) is the zero-length boundary of a required string. No length or format rule is documented for the UUID beyond it being a required string — the same gap already accepted in `docs/test-conditions/api/auth/get-user.md` (COND-AUTH-INF-005), reused here rather than restated.
- `isbn`: no length or checksum rule is documented; validity is membership in the catalogue, not string shape. Treated as an EP membership question, not a BVA one.

**Authorization states**

- Valid token, caller's own `userId` → `201`.
- No `Authorization` header → `401`/`1200`.
- Malformed/garbage token → `401`/`1200`, same response as absent.
- Valid token for user A, body naming user B's `userId` → `401`/`1200` — live-verified 2026-09-05. The endpoint checks that the token's owner matches the body's `userId`, so cross-user writes are refused.

**Status codes and response shape**

| Scenario                                          | Status | Response                                                                                       |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Success, one or many valid unowned ISBNs          | `201`  | `{ books: [{ isbn: string }] }` — object, not a bare array (Swagger is wrong)                  |
| Batch mixing valid + unknown ISBN                 | `201`  | Echoes both; only the valid one persists — **live-verified 2026-09-05**                        |
| Missing, malformed, or other user's token         | `401`  | `{ code: "1200", message: "User not authorized!" }`                                            |
| Unknown ISBN, sole item in batch                  | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }`             |
| ISBN already in the collection                    | `400`  | `{ code: "1210", message: "ISBN already present in the User's Collection!" }`                  |
| `collectionOfIsbns` empty                         | `400`  | `{ code: "1207", message: "Collection of books required." }` — **live-verified 2026-09-05**    |
| `userId` empty string, or unknown but well-formed | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-05**; note `401` |
| `userId` or `collectionOfIsbns` key absent        | `500`  | HTML error page with a server stack trace — **live-verified 2026-09-05**                       |

**Spec ambiguities / unknowns**

- ~~What an empty `collectionOfIsbns`, an empty/unknown `userId`, or an absent key returns was undocumented.~~ Resolved by live check 2026-09-05; `docs/api-spec/book-store-endpoints.md` was corrected in the same pass and its provenance header amended.
- ~~Whether a token belonging to a different user can write to another user's collection.~~ Resolved by the same check — it cannot, `401`/`1200`.
- ~~Whether a partial batch is atomic.~~ Resolved — it is not, and the response body misreports it.
- Whether an expired token behaves identically to a malformed one is untestable within a suite run — the same gap accepted across the `/Account` files; see COND-POST-BOOKS-INF-002.
- No upper bound on `collectionOfIsbns` length is documented — see COND-POST-BOOKS-INF-001.
- Swagger documents `MessageModal.code` as `number`; every endpoint sharing that schema returns a **string** live, re-confirmed here for `1200`, `1205`, `1207`, and `1210`.

---

## Input field

### COND-POST-BOOKS-001: Add a single valid unowned ISBN to the caller's own collection

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| ID         | COND-POST-BOOKS-001                                                  |
| Priority   | High                                                                 |
| Category   | Input field                                                          |
| Technique  | EP                                                                   |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md`; live check 2026-09-05 |
| Test cases | POST-BOOKS-001                                                       |

**What to cover**
The core valid class: an authenticated user submits their own `userId` and a `collectionOfIsbns` holding one ISBN that exists in the catalogue and is not yet in their collection. The response is `201` with `{ books: [{ isbn }] }`, and the book is genuinely present in the collection afterwards.

**Values / boundaries**

```
# EP — valid class
userId: the caller's own UUID from registration
collectionOfIsbns: [{ isbn: "9781449325862" }]   # known-good catalogue ISBN
Expected: 201; body { books: [{ isbn: "9781449325862" }] }; books.length === 1
Verify persistence: GET /Account/v1/User/{UUID} lists 9781449325862
```

**Notes**
Persistence must be asserted by reading the collection back, not inferred from the `201` body — finding 2 of the 2026-09-05 live check shows the echo is unreliable. Merging the read-back into this condition rather than splitting it out follows the no-trigger/effect-splitting rule: one request exercises both.

---

### COND-POST-BOOKS-002: Add multiple valid unowned ISBNs in a single request

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| ID         | COND-POST-BOOKS-002                                                  |
| Priority   | Medium                                                               |
| Category   | Input field                                                          |
| Technique  | BVA                                                                  |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md`; live check 2026-09-05 |
| Test cases | POST-BOOKS-002                                                       |

**What to cover**
The "many" class of the `collectionOfIsbns` array: two valid unowned ISBNs submitted in one call are both accepted and both persisted, distinguishing batch handling from the single-item path.

**Values / boundaries**

```
# BVA — array length, minimum valid (1) covered by COND-POST-BOOKS-001; this is >1
collectionOfIsbns: [{ isbn: "9781449331818" }, { isbn: "9781449337711" }]
Expected: 201; books.length === 2; both ISBNs echoed
Verify persistence: both present in GET /Account/v1/User/{UUID}
```

**Notes**
Live-verified 2026-09-05. No upper bound is documented — see COND-POST-BOOKS-INF-001.

---

### COND-POST-BOOKS-003: Empty collectionOfIsbns array is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-POST-BOOKS-003                      |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-05 |
| Test cases | POST-BOOKS-003                           |

**What to cover**
The zero-length boundary of the `collectionOfIsbns` array: the key is present and well-typed but holds no items, and the request is rejected rather than treated as a successful no-op.

**Values / boundaries**

```
# BVA — array length, below minimum
collectionOfIsbns: []
Expected: 400; { code: "1207", message: "Collection of books required." }
```

**Notes**
Undocumented before the 2026-09-05 live check; reproduced on two users. Assert status, code, **and** message together — `1207` is reused by COND-POST-BOOKS-006/007 under a different status and message.

---

### COND-POST-BOOKS-004: Absent collectionOfIsbns key crashes the server

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-POST-BOOKS-004                      |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-05 |
| Test cases | POST-BOOKS-004                           |

**What to cover**
The distinct invalid class where the `collectionOfIsbns` key is absent from the body entirely: the server does not validate it and returns an unhandled `500` with an HTML stack-trace page, rather than the `400` an absent required field would normally produce.

**Values / boundaries**

```
# EP — invalid class: key absent (distinct from empty array, COND-POST-BOOKS-003)
Body: { userId: "<own UUID>" }        # collectionOfIsbns omitted
Expected: 500; HTML body containing a TypeError stack trace (api/routes/books.js)
Not: 400, and not a JSON MessageModal
```

**Notes**
This is a defect being pinned, not endorsed — the test documents current behavior so a future fix to `400` shows as an intentional change. Kept separate from COND-POST-BOOKS-003 because absent and empty genuinely differ here, unlike in the `/Account` endpoints where they collapse into one class. Requires a raw request rather than the typed client, since the client signature makes the field mandatory.

---

### COND-POST-BOOKS-005: Absent userId key crashes the server

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-POST-BOOKS-005                      |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-05 |
| Test cases | POST-BOOKS-005                           |

**What to cover**
The mirror invalid class for the other required field: `userId` absent from the body produces an unhandled `500` leaking a Sequelize query-generator stack trace, rather than a validated rejection.

**Values / boundaries**

```
# EP — invalid class: key absent (distinct from empty string, COND-POST-BOOKS-006)
Body: { collectionOfIsbns: [{ isbn: "9781449325862" }] }   # userId omitted
Expected: 500; HTML body containing a Sequelize stack trace
Not: 401/1207, which is what an empty-string userId returns
```

**Notes**
Same defect-pinning rationale as COND-POST-BOOKS-004, and likewise needs a raw request. The leaked stack trace is itself an information-disclosure smell worth having recorded, though this suite asserts behavior rather than filing it.

---

### COND-POST-BOOKS-006: Empty-string userId is rejected as not correct

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-POST-BOOKS-006                      |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-05 |
| Test cases | POST-BOOKS-006                           |

**What to cover**
The zero-length boundary of the required `userId` string: present but empty, rejected with `401`/`1207` "User Id not correct!" — notably a `401` rather than the `400` a body-validation failure would suggest.

**Values / boundaries**

```
# BVA — string length, empty
userId: ""
collectionOfIsbns: [{ isbn: "9781449325862" }]
Expected: 401; { code: "1207", message: "User Id not correct!" }
```

**Notes**
The `401`-not-`400` pairing is the point of the condition: a client branching on status alone would misread this as an auth problem. Assert status, code, and message together.

---

### COND-POST-BOOKS-007: Well-formed but unknown userId is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-POST-BOOKS-007                      |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-05 |
| Test cases | POST-BOOKS-007                           |

**What to cover**
The invalid class where `userId` is a syntactically valid UUID that belongs to no user: rejected with `401`/`1207`, byte-identical to the empty-string case.

**Values / boundaries**

```
# EP — invalid class: unknown-but-well-formed identifier
userId: "11111111-2222-3333-4444-555555555555"
collectionOfIsbns: [{ isbn: "9781449325862" }]
Expected: 401; { code: "1207", message: "User Id not correct!" }
```

**Notes**
Kept separate from COND-POST-BOOKS-006 despite the identical response, following the same precedent as COND-AUTH-013/014 in `get-user.md`: two genuinely distinct invalid classes deserve two conditions even when the SUT collapses them.

---

### COND-POST-BOOKS-008: Unknown ISBN as the sole batch item is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-POST-BOOKS-008                           |
| Priority   | Medium                                        |
| Category   | Input field                                   |
| Technique  | EP                                            |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | POST-BOOKS-008                                |

**What to cover**
The invalid class for `isbn`: a value not present in the book catalogue, submitted as the only item in the batch, is rejected with `400`/`1205`.

**Values / boundaries**

```
# EP — invalid class: ISBN not in catalogue
collectionOfIsbns: [{ isbn: "0000000000000" }]
Expected: 400; { code: "1205", message: "ISBN supplied is not available in Books Collection!" }
```

**Notes**
"Sole item" is load-bearing — the same unknown ISBN alongside a valid one produces `201` instead, which is COND-POST-BOOKS-009.

---

### COND-POST-BOOKS-009: Batch mixing valid and unknown ISBNs succeeds but stores only the valid one

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-POST-BOOKS-009                      |
| Priority   | High                                     |
| Category   | Behavior                                 |
| Technique  | Exploratory heuristic                    |
| Source     | Observed behavior: live check 2026-09-05 |
| Test cases | POST-BOOKS-009                           |

**What to cover**
The non-atomic batch: a `collectionOfIsbns` holding one catalogue ISBN and one unknown ISBN returns `201` and echoes **both** back, yet only the valid one is actually persisted. The response body misreports what was stored.

**Values / boundaries**

```
# Exploratory — partial-batch atomicity
collectionOfIsbns: [{ isbn: "9781449325862" }, { isbn: "0000000000000" }]
Expected: 201; body echoes BOTH isbns; books.length === 2
Then GET /Account/v1/User/{UUID}: contains 9781449325862, does NOT contain 0000000000000
```

**Notes**
High priority despite being an edge case: this is the condition that proves the `201` body cannot be used to confirm a write, which affects how every other test in this file verifies success. Reproduced on two independent users, 2026-09-05. Documents current behavior rather than asserting it is correct.

---

## State

### COND-POST-BOOKS-010: Adding an ISBN already in the collection is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-POST-BOOKS-010                           |
| Priority   | Medium                                        |
| Category   | State                                         |
| Technique  | Decision table                                |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | POST-BOOKS-010                                |

**What to cover**
The state-dependent rejection: the same ISBN, valid and accepted on first submission, is refused with `400`/`1210` when submitted again by the same user. The endpoint is not idempotent — a repeat is an error, not a no-op.

**Values / boundaries**

```
# Decision table — ISBN membership in caller's collection
ISBN not in collection + valid token  → 201
ISBN already in collection + valid token → 400, { code: "1210",
    message: "ISBN already present in the User's Collection!" }
Setup: seed the user's collection with 9781449325862, then re-submit it
```

**Notes**
Independently testable via a seeded fixture — it does not depend on COND-POST-BOOKS-001 having run.

---

## Authorization

### COND-POST-BOOKS-011: Request without an Authorization header is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-POST-BOOKS-011                           |
| Priority   | High                                          |
| Category   | Authorization                                 |
| Technique  | EP                                            |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | POST-BOOKS-011                                |

**What to cover**
An otherwise entirely valid request sent with no `Authorization` header is refused with `401`/`1200`, and no book is added.

**Values / boundaries**

```
# EP — invalid class: no credentials
Headers: (no Authorization)
Body: valid userId + [{ isbn: "9781449325862" }]
Expected: 401; { code: "1200", message: "User not authorized!" }
```

**Notes**
None.

---

### COND-POST-BOOKS-012: Request with a malformed token is rejected

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| ID         | COND-POST-BOOKS-012                                                  |
| Priority   | Medium                                                               |
| Category   | Authorization                                                        |
| Technique  | EP                                                                   |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md`; live check 2026-09-05 |
| Test cases | POST-BOOKS-012                                                       |

**What to cover**
A present but syntactically invalid bearer token is refused with `401`/`1200`, identically to an absent header.

**Values / boundaries**

```
# EP — invalid class: malformed credentials
Headers: Authorization: Bearer not-a-real-token
Expected: 401; { code: "1200", message: "User not authorized!" }
```

**Notes**
Kept separate from COND-POST-BOOKS-011 despite the identical response — same precedent as COND-AUTH-013/014 in `get-user.md`.

---

### COND-POST-BOOKS-013: A user's token cannot add books to another user's collection

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-POST-BOOKS-013                      |
| Priority   | High                                     |
| Category   | Authorization                            |
| Technique  | Decision table                           |
| Source     | Observed behavior: live check 2026-09-05 |
| Test cases | POST-BOOKS-013                           |

**What to cover**
The cross-user authorization boundary: user A holds a valid token but names user B's `userId` in the body. The request is refused with `401`/`1200` — the token's owner must match the body's `userId`.

**Values / boundaries**

```
# Decision table — token owner vs. body userId
token(A) + userId(A) → 201
token(A) + userId(B) → 401, { code: "1200", message: "User not authorized!" }
Setup: two independent registered users, each with a token
Expected: user B's collection is unchanged afterwards
```

**Notes**
High priority — this is the condition that would catch a genuine privilege-escalation regression, not merely a validation slip. Live-verified 2026-09-05 in both directions (A→B and B→A). Undocumented in Swagger and absent from the spec doc before that check.

---

## Infeasible conditions

### COND-POST-BOOKS-INF-001: Upper bound on collectionOfIsbns array length (infeasible)

| Field      | Value                   |
| ---------- | ----------------------- |
| ID         | COND-POST-BOOKS-INF-001 |
| Priority   | Low                     |
| Category   | Input field             |
| Technique  | BVA                     |
| Source     | Spec gap                |
| Test cases | —                       |

**What to cover**
The maximum number of ISBNs accepted in a single `collectionOfIsbns` array, and the behavior one item beyond it.

**Why infeasible**
No upper bound is documented in Swagger or the live-verified spec doc, and none can be derived. Establishing one empirically would mean submitting progressively larger batches against the shared public DemoQA backend until something breaks — load-generating probing that Risk-1 in `docs/test-plan.md` rules out, and whose result would be an artifact of that instance rather than a contract.

**Mitigation**
The "many" class is covered at 2 items by COND-POST-BOOKS-002, which is the meaningful distinction from the 1-item path. If a documented limit ever appears, promote this to a numbered condition.

---

### COND-POST-BOOKS-INF-002: Expired token behavior (infeasible)

| Field      | Value                   |
| ---------- | ----------------------- |
| ID         | COND-POST-BOOKS-INF-002 |
| Priority   | Medium                  |
| Category   | Authorization           |
| Technique  | EP                      |
| Source     | Spec gap                |
| Test cases | —                       |

**What to cover**
Whether a token that was valid and has since expired is refused identically to a malformed one (`401`/`1200`), or produces a distinct response.

**Why infeasible**
Token lifetime is not documented and cannot be controlled from the client. Reaching the expired state needs a wait of unknown, likely multi-hour duration inside a suite run.

**Mitigation**
The same gap is already accepted in `docs/test-conditions/api/auth/post-authorized.md` and `docs/test-conditions/api/auth/post-generate-token.md`, the two `/Account` files that carry this precedent. Malformed-token handling (COND-POST-BOOKS-012) covers the nearest reachable invalid-credential class.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                    |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — `userId` and `collectionOfIsbns` both via COND-POST-BOOKS-001                                       |
| Does every required input field have at least one invalid EP condition?                | Yes — `userId`: 005/006/007; `collectionOfIsbns`: 003/004; `isbn`: 008                                    |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes — array: empty (003), 1 (001), 2 (002); `userId`: empty (006). Upper bound deferred as INF-001        |
| Does every authorization state produce a distinct condition?                           | Yes — valid (001), absent (011), malformed (012), other user's (013); expired deferred as INF-002         |
| Are all infeasible conditions documented?                                              | Yes — INF-001, INF-002                                                                                    |
| Does every analysis bullet map to at least one condition?                              | Yes                                                                                                       |
| Are all conditions independently testable?                                             | Yes — 010 seeds its own precondition rather than depending on 001; 013 seeds two users                    |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — the `201`-shape and persistence assertions are folded into 001 rather than split, per the merge rule |

**Coverage gaps identified**

- Upper bound on `collectionOfIsbns` length — deferred as COND-POST-BOOKS-INF-001.
- Expired-token handling — deferred as COND-POST-BOOKS-INF-002.
- `isbn` string-shape validation (length, checksum) is not covered: validity here is catalogue membership, not format, so there is no documented format rule to test against.

**Deferred conditions**

- COND-POST-BOOKS-INF-001, COND-POST-BOOKS-INF-002 — both above.
