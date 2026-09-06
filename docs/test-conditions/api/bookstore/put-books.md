# Test Conditions — PUT /BookStore/v1/Books/{ISBN}

## Endpoint analysis

**Endpoint:** PUT /BookStore/v1/Books/{ISBN}
**Source:** `docs/api-spec/book-store-endpoints.md` (live-verified), extended by live check 2026-09-06. Live behavior wins over Swagger wherever the two disagree.

**What this endpoint does**

Replaces one book in a user's collection with another. The book being replaced is named by the **path** parameter `ISBN`; its replacement is the `isbn` field of the **request body**, alongside the `userId` naming the target user. A bearer token identifies the caller. Success is `200` returning the full `GetUserResult` — the user's whole post-replacement collection, not just the changed entry.

Before the 2026-09-06 live check, `docs/api-spec/book-store-endpoints.md` documented only two cases for this endpoint (`200` and `401`), and Swagger declared a `400` with no scenarios attached to it. Every input-validation and state condition below was established by that check, each reproduced on two independent `qa_`-prefixed users.

Four behaviors from that check shape the conditions:

1. **Replacing a book with one the user already owns destroys a book.** A user holding `[A, B]` who replaces `A` with `B` receives `200` and is left with `[B]` — two entries become one, with no error. The response body accurately reports the shrunken collection, so the defect is in the operation, not the reporting. This is the most serious behavior on the endpoint and drives the highest-priority condition here.
2. **Replacing a book with itself is refused with a false reason.** `PUT /Books/{A}` with body `isbn: A`, for a user who owns `A`, returns `400`/`1206` "ISBN supplied is not available in User's Collection!" — contradicting the actual state.
3. **This endpoint validates its body where `POST` crashes.** An absent `userId` or `isbn` key returns a handled `400`/`1207`, not the `500` stack trace `POST /BookStore/v1/Books` produces for the same omission (COND-POST-BOOKS-004/005). Three endpoints on this resource now handle an absent required field three different ways.
4. **`1206` is new to this resource** and means "not in _your_ collection", distinct from `1205`'s "not in the _catalogue_". The path `ISBN` is checked for collection membership _before_ catalogue validity, so an ISBN that is neither returns `1206`.

**Happy path**

- Valid token, own `userId`, path `ISBN` in the caller's collection, body `isbn` a catalogue book the caller does not own → `200`, the named book is swapped, and every other book in the collection is preserved.

**Negative cases**

- Path `ISBN` is a catalogue book the caller does not own → `400`/`1206`.
- Path `ISBN` is unknown to the catalogue entirely → `400`/`1206` (membership checked before catalogue validity).
- Body `isbn` is unknown to the catalogue → `400`/`1205`.
- `userId` well-formed but belonging to no user → `401`/`1207`.
- `userId` present but an empty string → `400`/`1207` "Request Body is Invalid!".
- `userId` key absent from the body → `400`/`1207`.
- `isbn` key absent from the body → `400`/`1207`.
- Body is an empty JSON object `{}` (both keys absent at once) → `400`/`1207`.
- No `Authorization` header → `401`/`1200`.
- Malformed/garbage token → `401`/`1200`.
- Valid token for user A naming user B's `userId` → `401`/`1200`, B's collection unchanged.

**Boundary cases**

- Collection size: the endpoint requires the path `ISBN` to already be present, so a 0-book collection cannot satisfy any valid call — the zero boundary is covered by the not-in-collection class rather than as a separate valid case. A 1-book collection is the minimum on which a replacement can succeed; a ≥2-book collection is what makes the preserve-the-others assertion meaningful.
- `userId`: empty string (0 chars) is the zero-length boundary of a required string, and — unlike `DELETE /BookStore/v1/Books`, where empty and absent collapse — it produces the same `400`/`1207` as an absent key here. No length or format rule is documented for the identifier beyond it being a required string; that gap is already owned by COND-AUTH-INF-005 in `get-user.md` and is not restated here. The citation covers the identifier's **format/length rule only** — that condition concerns a path parameter, whereas `userId` here is a body field.
- Body `isbn`: empty string (0 chars) is rejected with `400`/`1207` as a body-validity failure, not with `1205`.
- Request body as a whole: the empty JSON object `{}` — zero fields — is the boundary below "one required key missing", and is rejected with the same `400`/`1207`.

**State / data-integrity**

- Body `isbn` already in the caller's collection → `200`, and the collection loses an entry. Distinct from the happy path in outcome, not merely in input.
- Path `ISBN` equal to body `isbn` (no-op replacement) → `400`/`1206`, despite the book being present.
- Ordinary replacement on a multi-book collection leaves every untouched book in place.

**Authorization states**

- Valid token, caller's own `userId` → `200`.
- No `Authorization` header → `401`/`1200`.
- Malformed/garbage token → `401`/`1200`, same response as absent.
- Valid token for user A, `userId` of user B → `401`/`1200` — live-verified 2026-09-06.

**Status codes and response shape**

| Scenario                                       | Status | Response                                                                               |
| ---------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Success                                        | `200`  | Full `GetUserResult`: `{ userId, username, books: BookModal[] }` — lowercase `userId`  |
| Path `ISBN` not owned, or unknown to catalogue | `400`  | `{ code: "1206", message: "ISBN supplied is not available in User's Collection!" }`    |
| Path `ISBN` equals body `isbn`                 | `400`  | `{ code: "1206", ... }` — same body as above                                           |
| Body `isbn` unknown to catalogue               | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }`     |
| Body invalid: `userId`/`isbn` absent or empty  | `400`  | `{ code: "1207", message: "Request Body is Invalid!" }` — **not** a `500` as on `POST` |
| `userId` well-formed but unknown               | `401`  | `{ code: "1207", message: "User Id not correct!" }`                                    |
| Missing, malformed, or other user's token      | `401`  | `{ code: "1200", message: "User not authorized!" }`                                    |

**Spec ambiguities / unknowns**

- ~~What the Swagger-declared `400` actually covers.~~ Resolved by live check 2026-09-06 — it carries three distinct codes (`1205`, `1206`, `1207`) under different causes. `docs/api-spec/book-store-endpoints.md` was corrected in the same pass and its provenance header amended.
- ~~Whether an absent required body key crashes the server as it does on `POST`.~~ Resolved — it does not; `400`/`1207`.
- ~~What happens when the replacement ISBN is already in the collection.~~ Resolved — `200`, and the collection silently loses an entry.
- ~~Whether a token belonging to a different user can modify another user's collection.~~ Resolved — it cannot, `401`/`1200`, target's collection intact.
- The `200` response lists books in a different order from a subsequent `GET /Account/v1/User/{UUID}` read-back (same set, different sequence). No ordering guarantee is documented, so conditions here assert membership rather than position.
- Whether an expired token behaves identically to a malformed one is untestable within a suite run — the same gap accepted across the `/Account` files, `post-books.md`, and `delete-books.md`; see COND-PUT-BOOKS-INF-001.
- Swagger documents `MessageModal.code` as `number`; every endpoint sharing that schema returns a **string** live, re-confirmed here for `1205`, `1206`, `1207`, and `1200`.

---

## Input field

### COND-PUT-BOOKS-001: Path ISBN not in the user's collection is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-001                       |
| Priority   | High                                     |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The invalid class where the path `ISBN` names a real catalogue book that the caller does not own: the replacement is refused with `400`/`1206`, and the collection is left unchanged.

**Values / boundaries**

```
# EP — invalid class: path ISBN valid in catalogue, absent from user's collection
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449337711     # a catalogue book the user does NOT own
Body: { "userId": "<own UUID>", "isbn": "9781449331818" }
Expected: 400; { code: "1206", message: "ISBN supplied is not available in User's Collection!" }
Verify: the collection still contains exactly 9781449325862
```

**Notes**
Undocumented before the 2026-09-06 live check; reproduced on two users. `1206` appears nowhere else on this resource — every other endpoint's "wrong ISBN" case is `1205`. Asserting the code alone is insufficient: assert status, code, **and** message, since `1206`'s message names the _user's_ collection while `1205`'s names the _catalogue_.

Priority High: this is the endpoint's primary ownership check, and a regression that accepted a non-owned ISBN would let a caller mutate a book they have no claim on.

The unchanged-collection assertion is what distinguishes a genuine rejection from a `400` returned after the write already happened.

---

### COND-PUT-BOOKS-002: Path ISBN unknown to the catalogue is rejected as not-owned

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-002                       |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The invalid class where the path `ISBN` exists in no catalogue at all: it is refused with `400`/`1206` — the collection-membership check runs _before_ catalogue validation, so the response names the user's collection rather than the catalogue.

**Values / boundaries**

```
# EP — invalid class: path ISBN not a catalogue entry
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/0000000000000     # not a real catalogue ISBN
Body: { "userId": "<own UUID>", "isbn": "9781449331818" }
Expected: 400; { code: "1206", message: "ISBN supplied is not available in User's Collection!" }
Not: 1205 — the catalogue check never runs for the path parameter
```

**Notes**
Kept separate from COND-PUT-BOOKS-001 despite the identical response: these are distinct invalid classes (a real book not owned vs. a book that does not exist), following the same precedent as COND-DELETE-BOOKS-001/002/003 and COND-POST-BOOKS-006/007.

The substantive half is the "not `1205`" expectation. The sibling `GET /BookStore/v1/Book` and `POST /BookStore/v1/Books` both answer an unknown ISBN with `1205`, so the reasonable prior is that this endpoint would too. Recording the check order stops a future reader from assuming it.

---

### COND-PUT-BOOKS-003: Body isbn unknown to the catalogue is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-003                       |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The invalid class where the replacement `isbn` in the body names no catalogue book: refused with `400`/`1205`, and the collection is left unchanged.

**Values / boundaries**

```
# EP — invalid class: body isbn not a catalogue entry
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862     # a book the user DOES own
Body: { "userId": "<own UUID>", "isbn": "0000000000000" }
Expected: 400; { code: "1205", message: "ISBN supplied is not available in Books Collection!" }
Verify: the collection still contains exactly 9781449325862
```

**Notes**
The counterpart to COND-PUT-BOOKS-002, and the reason both are worth having: the _same_ unknown ISBN produces `1206` in the path and `1205` in the body. One condition alone would leave that asymmetry unrecorded.

Uses the same `0000000000000` value as COND-POST-BOOKS-008 and GET-BOOK-002 against the same catalogue, so all three endpoints agree on what an unknown ISBN means.

---

### COND-PUT-BOOKS-004: Empty-string userId is rejected as an invalid body

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-004                       |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The zero-length boundary of the required `userId` body field: present but holding no value, rejected with `400`/`1207` "Request Body is Invalid!" — a body-shape failure, not the `401`/`1207` "User Id not correct!" that an unknown-but-present identifier produces.

**Values / boundaries**

```
# BVA — string length, empty
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "", "isbn": "9781449331818" }
Expected: 400; { code: "1207", message: "Request Body is Invalid!" }
Not: 401, and not the "User Id not correct!" message
```

**Notes**
The status/message split is the point. On `DELETE /BookStore/v1/Books` an empty `UserId` returns `401`/"User Id not correct!" (COND-DELETE-BOOKS-002); here the same empty value returns `400`/"Request Body is Invalid!". Asserting the code `1207` alone would pass against either endpoint's behavior and so would catch nothing — status and message must be asserted together.

---

### COND-PUT-BOOKS-005: Well-formed but unknown userId is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-005                       |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The invalid class where `userId` is a syntactically valid UUID belonging to no user: rejected with `401`/`1207` "User Id not correct!" — a different status _and_ message from the empty-string case.

**Values / boundaries**

```
# EP — invalid class: unknown-but-well-formed identifier
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "11111111-2222-3333-4444-555555555555", "isbn": "9781449331818" }
Headers: valid Authorization: Bearer <own token>
Expected: 401; { code: "1207", message: "User Id not correct!" }
Not: 400, and not the "Request Body is Invalid!" message
```

**Notes**
Uses the same `unknownUserId` value already established for `POST` and `DELETE` on this resource, so all three agree on what an unknown identifier means.

Paired deliberately with COND-PUT-BOOKS-004: this endpoint splits empty from unknown across two different statuses, where `DELETE /BookStore/v1/Books` collapses them into one. Both conditions are needed to pin that split.

---

### COND-PUT-BOOKS-006: Absent userId key is rejected without crashing

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-006                       |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The invalid class where the `userId` key is omitted from the request body entirely: the request is validated and refused with `400`/`1207`, **not** crashed into a `500` the way `POST /BookStore/v1/Books` handles the same omission.

**Values / boundaries**

```
# EP — invalid class: required key absent
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "isbn": "9781449331818" }        # no userId key at all
Expected: 400; { code: "1207", message: "Request Body is Invalid!" }
Not: 500, and not an HTML stack-trace page
```

**Notes**
The "not 500" half is the substantive part. `POST /BookStore/v1/Books` returns `500` with a Sequelize stack trace for an absent `userId` (COND-POST-BOOKS-004), so the sibling-endpoint prior predicts a crash here — and is wrong. Recording the divergence is the value; three endpoints on this resource now handle an absent required field three different ways.

Needs a raw request rather than the typed client, since the client signature makes `userId` mandatory — the same precedent as COND-POST-BOOKS-004/005 and COND-DELETE-BOOKS-001.

---

### COND-PUT-BOOKS-007: Absent isbn key is rejected without crashing

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-007                       |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The invalid class where the replacement `isbn` key is omitted from the request body entirely: refused with `400`/`1207`, identically to an absent `userId`.

**Values / boundaries**

```
# EP — invalid class: required key absent
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "<own UUID>" }         # no isbn key at all
Expected: 400; { code: "1207", message: "Request Body is Invalid!" }
Not: 500, and not 1205
```

**Notes**
Kept separate from COND-PUT-BOOKS-006 despite the identical response: they are distinct required fields, and the **Required fields** coverage rule asks for a missing-field condition per field, not per endpoint. On `POST /BookStore/v1/Books` the two absent keys produce _different_ `500`s (a Sequelize trace vs. a `TypeError` — COND-POST-BOOKS-004/005), so treating them as one class here would be assuming the symmetry rather than testing it.

Also needs a raw request, for the same reason as COND-PUT-BOOKS-006.

---

### COND-PUT-BOOKS-014: Empty JSON object body is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-014                       |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The empty boundary of the request body as a whole: a syntactically valid but entirely empty JSON object, with **both** required keys absent at once, refused with `400`/`1207`.

**Values / boundaries**

```
# BVA — request body, zero fields
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: {}                                  # neither userId nor isbn
Headers: valid Authorization: Bearer <own token>
Expected: 400; { code: "1207", message: "Request Body is Invalid!" }
Not: 500, and not an HTML stack-trace page
```

**Notes**
Kept separate from COND-PUT-BOOKS-006 and -007, which each omit one key while the other is still present. This is the zero-field boundary of the body itself rather than a single missing field, and the file's own reasoning in COND-PUT-BOOKS-007's Notes applies directly: on `POST /BookStore/v1/Books` the two absent keys produce _different_ `500`s, so absent-key behavior on this resource has already been shown not to be uniform. Treating `{}` as equivalent to 006/007 would assume the symmetry rather than test it.

Live-verified 2026-09-06 and recorded in `docs/api-spec/book-store-endpoints.md`; reproduced alongside the single-absent-key cases.

Needs a raw request, for the same reason as COND-PUT-BOOKS-006 and -007 — the client's payload type requires both fields.

---

## State

### COND-PUT-BOOKS-008: Valid replacement swaps the book and preserves the rest of the collection

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| ID         | COND-PUT-BOOKS-008                                                   |
| Priority   | High                                                                 |
| Category   | State                                                                |
| Technique  | EP                                                                   |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md`; live check 2026-09-06 |
| Test cases | —                                                                    |

**What to cover**
The core valid class: an authenticated user replaces a book they own with a different catalogue book they do not own. The response is `200` carrying the full `GetUserResult`, the named book is gone, the replacement is present, and every other book in the collection is untouched.

**Values / boundaries**

```
# EP — valid class
Setup: caller's collection seeded with two ISBNs
       [{ isbn: "9781449325862" }, { isbn: "9781449337711" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "<own UUID>", "isbn": "9781449331818" }
Expected: 200; body is { userId, username, books: BookModal[] } — lowercase userId
          body.userId === own UUID; body.username === own userName
          books contains 9781449331818 and 9781449337711; does NOT contain 9781449325862
Verify persistence: GET /Account/v1/User/{UUID} → same set of two ISBNs
Assert membership, not order — the PUT body and the read-back differ in sequence
```

**Notes**
Seeding two books rather than one is deliberate and load-bearing: with a single book, "replaced the named book" and "replaced the entire collection" are indistinguishable outcomes. The untouched second book is what proves the operation is scoped to one entry — and it is the assertion that would fail against the data-loss defect in COND-PUT-BOOKS-009 if that defect ever widened.

Asserting the collection size stays at two is as important as asserting membership: the defect this endpoint actually has is a silent size reduction, so a test that only checked "contains the new ISBN" would pass while a book vanished.

Merging the response-shape check into this condition rather than splitting it out follows the no-trigger/effect-splitting rule — one request exercises both. The read-back is likewise part of this condition, matching the precedent set by COND-DELETE-BOOKS-004.

---

### COND-PUT-BOOKS-009: Replacing a book with one already owned silently drops a book

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-009                       |
| Priority   | High                                     |
| Category   | State                                    |
| Technique  | Exploratory heuristic                    |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The data-integrity defect this endpoint owns: a user holding two books replaces one of them with the _other_ one they already own. The call returns `200` rather than a duplicate-rejection error, and the collection shrinks from two entries to one — a book is destroyed with no error surfaced.

**Values / boundaries**

```
# Exploratory — data integrity, duplicate replacement target
Setup: caller's collection seeded with
       [{ isbn: "9781449325862" }, { isbn: "9781449337711" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "<own UUID>", "isbn": "9781449337711" }   # target already owned
Expected (current, defective): 200; books has exactly ONE entry, 9781449337711
Not: 400 with { code: "1210", message: "ISBN already present in the User's Collection!" }
     — which is what POST /BookStore/v1/Books returns for a duplicate
Verify persistence: GET /Account/v1/User/{UUID} → exactly one ISBN, 9781449337711
```

**Notes**
Pins current (defective) behavior so a future fix surfaces as an intentional change rather than a silent one — the same rationale as COND-POST-BOOKS-004/005 and COND-GET-BOOK-005. The expectation deliberately encodes what the endpoint _does_, not what it _should_ do; the "not `1210`" line records what a correct implementation would plausibly return, since `POST` already has a duplicate-ISBN code for exactly this situation and does not reuse it here.

Priority High on the same basis as COND-DELETE-BOOKS-007: this is user data being destroyed by an ordinary, non-malicious action. It is the most consequential behavior on the endpoint, and the count assertion — exactly one entry, not merely "contains 9781449337711" — is the whole point. A membership-only assertion would pass while the book disappeared.

Distinct from COND-PUT-BOOKS-008 in outcome, not just input: 008 preserves the collection size, 009 reduces it. Both start from a two-book collection, which is what makes the contrast legible.

---

### COND-PUT-BOOKS-010: Replacing a book with itself is refused as not-in-collection

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-010                       |
| Priority   | Medium                                   |
| Category   | State                                    |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The no-op boundary of the replacement operation: the path `ISBN` and the body `isbn` name the same book, which the caller demonstrably owns. The call is refused with `400`/`1206` "ISBN supplied is not available in User's Collection!" — a message contradicting the actual state, since the book _is_ in the collection.

**Values / boundaries**

```
# BVA — zero-change boundary: path ISBN === body isbn
Setup: caller's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "<own UUID>", "isbn": "9781449325862" }   # identical
Expected: 400; { code: "1206", message: "ISBN supplied is not available in User's Collection!" }
Not: 200 — the no-op is rejected, not accepted as a trivial success
Verify: the collection still contains exactly 9781449325862 (nothing was lost)
```

**Notes**
The boundary between "replace with a different book" (COND-PUT-BOOKS-008) and "replace with the same book" — the degenerate case of the replacement input. Reproduced on two users, each verified to own the ISBN immediately beforehand, which is what rules out a stale-state explanation for the `1206`.

Documented as a defect rather than merely a quirk: the response's stated reason is factually wrong about the collection's contents. Distinct from COND-PUT-BOOKS-001, where `1206` is _correct_ — same code, one truthful use and one false one, which is precisely why both conditions exist.

The unchanged-collection check matters here: given COND-PUT-BOOKS-009's data loss, a rejected no-op that nonetheless removed the book would be the worse failure, and only an explicit assertion rules it out.

---

## Authorization

### COND-PUT-BOOKS-011: Request without an Authorization header is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-PUT-BOOKS-011                            |
| Priority   | High                                          |
| Category   | Authorization                                 |
| Technique  | EP                                            |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | —                                             |

**What to cover**
An otherwise entirely valid replacement sent with no `Authorization` header is refused with `401`/`1200`, and the collection is left intact.

**Values / boundaries**

```
# EP — invalid class: no credentials
Setup: target user's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "<valid UUID>", "isbn": "9781449331818" }
Headers: (no Authorization)
Expected: 401; { code: "1200", message: "User not authorized!" }
Verify: the collection still contains 9781449325862, not the replacement
```

**Notes**
Priority High on the same basis as COND-DELETE-BOOKS-007 and COND-AUTH-018: an authorization gap on a mutating endpoint means unauthenticated data modification, not merely an information leak. The intact-collection assertion is what makes that meaningful — a `401` that performed the swap anyway would be the real defect.

---

### COND-PUT-BOOKS-012: Request with a malformed token is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-PUT-BOOKS-012                            |
| Priority   | Medium                                        |
| Category   | Authorization                                 |
| Technique  | EP                                            |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | —                                             |

**What to cover**
A present but syntactically invalid bearer token is refused with `401`/`1200`, identically to an absent header.

**Values / boundaries**

```
# EP — invalid class: malformed credentials
Setup: target user's collection seeded with [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "<valid UUID>", "isbn": "9781449331818" }
Headers: Authorization: Bearer not-a-real-token
Expected: 401; { code: "1200", message: "User not authorized!" }
```

**Notes**
Kept separate from COND-PUT-BOOKS-011 despite the identical response — same precedent as COND-AUTH-013/014 in `get-user.md`, COND-POST-BOOKS-011/012, and COND-DELETE-BOOKS-007/008.

---

### COND-PUT-BOOKS-013: A user's token cannot modify another user's collection

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-PUT-BOOKS-013                       |
| Priority   | High                                     |
| Category   | Authorization                            |
| Technique  | Decision table                           |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | —                                        |

**What to cover**
The cross-user authorization boundary: user A holds a valid token but names user B's `userId` in the body. The request is refused with `401`/`1200` and B's collection is left intact — the token's owner must match the named `userId`.

**Values / boundaries**

```
# Decision table — token owner vs. body userId
token(A) + userId(A) → 200    # baseline (see COND-PUT-BOOKS-008), not re-tested here
token(A) + userId(B) → 401, { code: "1200", message: "User not authorized!" }
Setup: two independent registered users; B's collection seeded with
       [{ isbn: "9781449325862" }]
URL:  PUT /BookStore/v1/Books/9781449325862
Body: { "userId": "<B's UUID>", "isbn": "9781449331818" }
Headers: Authorization: Bearer <A's token>
Expected: user B's collection still contains 9781449325862 afterwards
```

**Notes**
High priority — this is the condition that would catch a genuine privilege-escalation regression rather than a validation slip, and on this endpoint the escalation modifies another user's data rather than merely reading it. Live-verified 2026-09-06. Undocumented in Swagger and absent from the spec doc before that check.

The intact-collection assertion is load-bearing for the same reason as in COND-PUT-BOOKS-011: the status code alone would not catch a replacement that happened anyway.

Needs two independently seeded users, which `generate-api-tests` does not currently support — see the note in the completeness check below.

---

## Infeasible conditions

### COND-PUT-BOOKS-INF-001: Expired token behavior (infeasible)

| Field      | Value                  |
| ---------- | ---------------------- |
| ID         | COND-PUT-BOOKS-INF-001 |
| Priority   | Medium                 |
| Category   | Authorization          |
| Technique  | EP                     |
| Source     | Spec gap               |
| Test cases | —                      |

**What to cover**
Whether a token that was valid and has since expired is refused identically to a malformed one (`401`/`1200`), or produces a distinct response.

**Why infeasible**
Token lifetime is not documented and cannot be controlled from the client. Reaching the expired state needs a wait of unknown, likely multi-hour duration inside a suite run.

**Mitigation**
The same gap is already accepted in `docs/test-conditions/api/auth/post-authorized.md`, `post-generate-token.md`, `post-books.md` (COND-POST-BOOKS-INF-002), and `delete-books.md` (COND-DELETE-BOOKS-INF-001). Malformed-token handling (COND-PUT-BOOKS-012) covers the nearest reachable invalid-credential class.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Does every required input field have a valid EP condition?                             | Yes — path `ISBN`, body `isbn`, and `userId` are all exercised validly by COND-PUT-BOOKS-008                                                                                                                                                                                                                 |
| Does every required input field have at least one invalid EP condition?                | Yes — path `ISBN`: 001 (not owned), 002 (unknown); body `isbn`: 003 (unknown), 007 (absent); `userId`: 004 (empty), 005 (unknown), 006 (absent); both keys absent at once: 014                                                                                                                               |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes — `userId` empty (004); request body empty, zero fields (014); replacement no-op boundary (010); collection size ≥2 for the preserve-others assertion (008) and the drop-a-book case (009). A 0-book collection cannot satisfy a valid call, so it is covered by 001's not-in-collection class           |
| Does every authorization state produce a distinct condition?                           | Yes — valid (008), absent (011), malformed (012), other user's (013); expired deferred as INF-001                                                                                                                                                                                                            |
| Are all infeasible conditions documented?                                              | Yes — INF-001                                                                                                                                                                                                                                                                                                |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                                                                                                                                                                      |
| Are all conditions independently testable?                                             | Yes — each seeds its own user and collection state. 009 and 010 seed their own preconditions rather than depending on 008 having run                                                                                                                                                                         |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — the `200` response shape and the read-back are folded into 008 rather than split, per the merge rule. 008/009/010 share a starting shape but produce three different outcomes, so none is another's effect. 006/007/014 share a response but are three distinct inputs, not one trigger and its effects |

**Analysis-to-condition mapping**

- Happy path (valid replacement, others preserved) → COND-PUT-BOOKS-008
- Negative: path `ISBN` not owned → COND-PUT-BOOKS-001
- Negative: path `ISBN` unknown to catalogue → COND-PUT-BOOKS-002
- Negative: body `isbn` unknown to catalogue → COND-PUT-BOOKS-003
- Negative: `userId` empty → COND-PUT-BOOKS-004
- Negative: `userId` unknown → COND-PUT-BOOKS-005
- Negative: `userId` key absent → COND-PUT-BOOKS-006
- Negative: `isbn` key absent → COND-PUT-BOOKS-007
- Negative: empty JSON object body `{}` → COND-PUT-BOOKS-014
- Negative: no `Authorization` header → COND-PUT-BOOKS-011
- Negative: malformed token → COND-PUT-BOOKS-012
- Negative: cross-user replacement → COND-PUT-BOOKS-013
- Boundary: `userId` zero-length → COND-PUT-BOOKS-004; format/length gap → COND-AUTH-INF-005 in `get-user.md` (same identifier, not duplicated — format/length only; that condition covers a path parameter, this a body field)
- Boundary: request body zero-field (`{}`) → COND-PUT-BOOKS-014
- Boundary: replacement no-op (path `ISBN` === body `isbn`) → COND-PUT-BOOKS-010
- Boundary: collection size ≥2 → COND-PUT-BOOKS-008 (preserved) and COND-PUT-BOOKS-009 (reduced)
- State/data integrity: duplicate replacement target drops a book → COND-PUT-BOOKS-009
- State: ordinary replacement preserves untouched books → COND-PUT-BOOKS-008
- Authorization states: valid/absent/malformed/cross-user → 008, 011, 012, 013; expired → INF-001
- Status codes/response shape: `200` `GetUserResult` → 008, 009; `400`/`1206` → 001, 002, 010; `400`/`1205` → 003; `400`/`1207` → 004, 006, 007, 014; `401`/`1207` → 005; `401`/`1200` → 011, 012, 013
- Spec ambiguities: Swagger's unattached `400` resolved 2026-09-06 → 001–007, 010; absent-key handling resolved → 006, 007, 014; duplicate-target behavior resolved → 009; cross-user resolved → 013; response ordering → asserted as membership in 008; expired token → INF-001

**Coverage gaps identified**

- Expired-token handling — deferred as COND-PUT-BOOKS-INF-001.
- `userId` string-shape validation (length, format) is not covered: no rule is documented for the identifier, a gap owned by COND-AUTH-INF-005 in `get-user.md` — cited for the format/length rule only, since that condition covers a path parameter and this one a body field.
- The `200` response's book ordering has no documented guarantee and is not asserted positionally anywhere; COND-PUT-BOOKS-008 asserts membership instead. Recorded rather than tested, since no contract exists to test against.

**Deferred conditions**

- COND-PUT-BOOKS-INF-001 — above.

**Automation note (not a coverage gap)**

COND-PUT-BOOKS-013 requires two independently seeded users. `generate-api-tests` currently refuses multi-actor test cases, so this condition's test case is expected to be written manually and left `Not automated` at stage 4 — the same outcome as COND-DELETE-BOOKS-009, whose test case DELETE-BOOKS-009 was deliberately not generated for this reason. Its condition remains High priority: the limitation is in the generator, not in the condition's importance, and the priority filter must not be used to paper over it.
