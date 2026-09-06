# Test Conditions — GET /BookStore/v1/Book

## Endpoint analysis

**Endpoint:** GET /BookStore/v1/Book
**Source:** `docs/api-spec/book-store-endpoints.md` (live-verified), extended by live check 2026-09-06. Live behavior wins over Swagger wherever the two disagree.

**What this endpoint does**

Returns one book from the catalogue, selected by an `ISBN` **query parameter**. There is no request body and no authentication. Success is `200` with a bare `BookModal` object — not wrapped in a `books` array, unlike its sibling `GET /BookStore/v1/Books`.

Unlike that sibling, this endpoint has a real input surface, so it has a genuine invalid-input space. Three behaviors established by the 2026-09-06 live check shape the conditions below, each reproduced across three independent runs:

1. **An absent `ISBN` crashes the server.** Omitting the parameter returns `500` with an HTML page leaking a Sequelize stack trace. This matches `POST /BookStore/v1/Books` (COND-POST-BOOKS-004/005) and is the **opposite** of `DELETE /BookStore/v1/Books`, where an absent `UserId` is validated into `401`/`1207` (COND-DELETE-BOOKS-001). Absent and empty genuinely differ here — an empty `ISBN` is handled with `400`/`1205`.
2. **The query parameter is case-sensitive.** `?isbn=` (lowercase) behaves exactly as if the parameter were absent — same `500`, same stack trace. Only `ISBN` is read.
3. **Every invalid-but-present `ISBN` collapses to one response.** Empty (COND-GET-BOOK-003), whitespace and non-numeric (both COND-GET-BOOK-004), and well-formed-but-unknown (COND-GET-BOOK-002) all return `400`/`1205` with identical text. Validity here is catalogue membership, not string format.

**Happy path**

- Valid catalogue ISBN → `200` with that book's full `BookModal`, whose `isbn` field echoes the requested value.

**Negative cases**

- `ISBN` well-formed but not in the catalogue → `400`/`1205`.
- `ISBN` present but empty → `400`/`1205`.
- `ISBN` malformed — non-numeric or whitespace-only → `400`/`1205` (one invalid class, COND-GET-BOOK-004).
- `ISBN` query parameter absent entirely → `500`, HTML stack trace.
- Parameter spelled `isbn` instead of `ISBN` → `500`, identical to absent.

**Boundary cases**

- `ISBN`: empty string (0 chars) is the zero-length boundary of a required string, and is handled rather than fatal. No length or checksum rule is documented — validity is catalogue membership, not format, so this is an EP membership question rather than a BVA one beyond the empty boundary. Same treatment as `isbn` in `post-books.md`.

**Authorization states**

- Not applicable in the usual sense — `GET` endpoints are unauthenticated per the spec doc. Confirmed live 2026-09-06 that a **bogus** bearer token returns `200` with the book: the header is not merely optional, it is ignored entirely and cannot produce a `401`.

**Status codes and response shape**

| Scenario                                      | Status | Response                                                                           |
| --------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Valid catalogue ISBN                          | `200`  | Bare `BookModal` object — not `{ books: [...] }`                                   |
| Unknown, empty, whitespace, or malformed ISBN | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }` |
| `ISBN` absent, or spelled `isbn`              | `500`  | HTML error page with a Sequelize stack trace — **live-verified 2026-09-06**        |
| Any request with an `Authorization` header    | `200`  | Header ignored; same as unauthenticated — **live-verified 2026-09-06**             |

**Spec ambiguities / unknowns**

- ~~What an absent, empty, or malformed `ISBN` returns.~~ Resolved by live check 2026-09-06; `docs/api-spec/book-store-endpoints.md` was corrected in the same pass and its provenance header amended.
- ~~Whether the query parameter is case-sensitive.~~ Resolved — it is; lowercase `isbn` is treated as absent.
- ~~Whether sending an `Authorization` header changes anything.~~ Resolved — it does not; a bogus token still returns `200`.
- Swagger documents `MessageModal.code` as `number`; every endpoint sharing that schema returns a **string** live, re-confirmed here for `1205`.
- No length or checksum rule for `ISBN` is documented — see COND-GET-BOOK-INF-001.

---

## Input field

### COND-GET-BOOK-001: Retrieve a book by a valid catalogue ISBN

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| ID         | COND-GET-BOOK-001                                                    |
| Priority   | High                                                                 |
| Category   | Input field                                                          |
| Technique  | EP                                                                   |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md`; live check 2026-09-06 |
| Test cases | GET-BOOK-001                                                         |

**What to cover**
The core valid class: an `ISBN` present in the catalogue returns `200` with that specific book's full `BookModal`, as a bare object rather than an array wrapper, and the returned `isbn` matches the one requested.

**Values / boundaries**

```
# EP — valid class
ISBN: "9781449325862"        # Git Pocket Guide, known-good catalogue entry
Expected: 200; bare BookModal object (no `books` wrapper)
          body.isbn === "9781449325862"
          body.title === "Git Pocket Guide"
          all BookModal fields present: isbn, title, subTitle, author,
          publish_date, publisher, pages, description, website
```

**Notes**
Asserting `isbn` and `title` against spec-known values — not merely that the fields are non-empty — is what makes this test able to detect the endpoint returning the _wrong_ book, which a truthiness check would miss.

The bare-object shape is worth asserting explicitly: the sibling `GET /BookStore/v1/Books` wraps its result in `{ books: [...] }`, so a regression that wrapped this response would be a real contract break.

---

### COND-GET-BOOK-002: Well-formed but unknown ISBN is rejected

| Field      | Value                                         |
| ---------- | --------------------------------------------- |
| ID         | COND-GET-BOOK-002                             |
| Priority   | Medium                                        |
| Category   | Input field                                   |
| Technique  | EP                                            |
| Source     | Spec: `docs/api-spec/book-store-endpoints.md` |
| Test cases | GET-BOOK-002                                  |

**What to cover**
The invalid class for `ISBN`: a value shaped like a real ISBN but absent from the catalogue is rejected with `400`/`1205`.

**Values / boundaries**

```
# EP — invalid class: not in catalogue
ISBN: "0000000000000"
Expected: 400; { code: "1205",
                 message: "ISBN supplied is not available in Books Collection!" }
```

**Notes**
The same `unknownIsbn` constant already used by `post-books.md` (COND-POST-BOOKS-008) against the same catalogue, so the two endpoints agree on what "not a real book" means.

---

### COND-GET-BOOK-003: Empty ISBN is rejected, not fatal

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-GET-BOOK-003                        |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | BVA                                      |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | GET-BOOK-003                             |

**What to cover**
The zero-length boundary of the `ISBN` parameter: present in the query string but holding no value. The request is handled and rejected with `400`/`1205` — **not** crashed into the `500` that an absent parameter produces.

**Values / boundaries**

```
# BVA — string length, empty
URL: GET /BookStore/v1/Book?ISBN=
Expected: 400; { code: "1205",
                 message: "ISBN supplied is not available in Books Collection!" }
Not: 500, and not an HTML stack-trace page
```

**Notes**
The "not 500" half is the substantive part. This is the one place on this endpoint where absent and empty diverge, so the boundary is meaningful rather than a formality — see COND-GET-BOOK-005 for the absent case.

Undocumented before the 2026-09-06 live check; reproduced across three runs.

---

### COND-GET-BOOK-004: Malformed ISBN — non-numeric or whitespace-only — is rejected

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-GET-BOOK-004                        |
| Priority   | Low                                      |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | GET-BOOK-004                             |

**What to cover**
The invalid class where `ISBN` is present but not shaped like an ISBN at all — an arbitrary alphabetic string, or a whitespace-only value — is rejected with `400`/`1205`, identically to a well-formed-but-unknown value. This confirms the endpoint validates catalogue membership rather than string format.

**Values / boundaries**

```
# EP — invalid class: malformed, not ISBN-shaped
# Both representatives of one class — same response, live-verified 2026-09-06
ISBN: "not-an-isbn"      # non-numeric
ISBN: "%20" (a single space, URL-encoded)   # whitespace-only
Expected (both): 400; { code: "1205",
                 message: "ISBN supplied is not available in Books Collection!" }
```

**Notes**
Whitespace-only and non-numeric are folded into one condition rather than split: both are "a present value that is not a catalogue ISBN", both were live-verified 2026-09-06 to return byte-identical responses, and neither exercises a distinct code path — the endpoint does no format validation to distinguish them. Splitting them would add a condition whose only difference is which characters were sent.

Low priority: the response is byte-identical to COND-GET-BOOK-002, and no separate format-validation code path exists to regress. Kept as a documented condition because "malformed" and "unknown" are genuinely distinct input classes even where the SUT collapses them — but it carries the least new information of any condition in this file, so it is the one deliberately not worth automating.

---

### COND-GET-BOOK-005: Absent ISBN query parameter crashes the server

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-GET-BOOK-005                        |
| Priority   | Medium                                   |
| Category   | Input field                              |
| Technique  | EP                                       |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | GET-BOOK-005                             |

**What to cover**
The distinct invalid class where the `ISBN` query parameter is omitted from the URL entirely: the server does not validate it and returns an unhandled `500` with an HTML page leaking a Sequelize stack trace, rather than the `400` its empty-value sibling produces.

**Values / boundaries**

```
# EP — invalid class: parameter absent (distinct from empty, COND-GET-BOOK-003)
URL: GET /BookStore/v1/Book        # no ?ISBN= at all
Expected: 500; HTML body containing a Sequelize stack trace
          ('WHERE parameter "isbn" has invalid "undefined" value')
Not: 400, and not a JSON MessageModal
```

**Notes**
This is a defect being pinned, not endorsed — the test documents current behavior so a future fix to `400` shows as an intentional change. Same rationale as COND-POST-BOOKS-004/005.

The leaked stack trace is an information-disclosure smell worth having recorded; this suite asserts behavior rather than filing it.

Requires a raw request rather than the typed client, since the client signature makes `isbn` mandatory — the same precedent as COND-POST-BOOKS-004/005 and COND-DELETE-BOOKS-001.

---

### COND-GET-BOOK-006: Lowercase isbn parameter is treated as absent

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-GET-BOOK-006                        |
| Priority   | Low                                      |
| Category   | Input field                              |
| Technique  | Exploratory heuristic                    |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | GET-BOOK-006                             |

**What to cover**
Query-parameter case sensitivity: a request spelling the parameter `isbn` instead of `ISBN`, with an otherwise valid catalogue value, is treated exactly as if no parameter were supplied — `500` with the same stack trace.

**Values / boundaries**

```
# Exploratory — parameter name casing
URL: GET /BookStore/v1/Book?isbn=9781449325862      # lowercase
Expected: 500; HTML body containing the same Sequelize stack trace as
          COND-GET-BOOK-005
Not: 200 with the book
```

**Notes**
Low priority: this is a client-error scenario with no user-facing path — nothing in the product spells the parameter wrong — and its response is byte-identical to COND-GET-BOOK-005's. Documented so the case-sensitivity is on record (a reader might reasonably assume query params are case-insensitive), but not worth an automated test of its own.

---

## Authorization

### COND-GET-BOOK-007: Authorization header is ignored entirely

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| ID         | COND-GET-BOOK-007                        |
| Priority   | Medium                                   |
| Category   | Authorization                            |
| Technique  | Decision table                           |
| Source     | Observed behavior: live check 2026-09-06 |
| Test cases | GET-BOOK-007                             |

**What to cover**
The endpoint is unauthenticated in the strong sense: a request carrying a **bogus** bearer token still returns `200` with the requested book, identical to a request with no header at all. The credential is not merely optional — it is never evaluated, so no `401` is reachable.

**Values / boundaries**

```
# Decision table — Authorization header vs. outcome
no header          + valid ISBN → 200, book returned (baseline, COND-GET-BOOK-001)
bogus bearer token + valid ISBN → 200, book returned — identical response
Expected: 200; body.isbn === "9781449325862"
Not: 401/1200, which every mutating BookStore endpoint returns for this token
```

**Notes**
Worth asserting rather than assuming: the same malformed token string returns `401`/`1200` on `POST` and `DELETE /BookStore/v1/Books`, so this condition pins the read/write asymmetry rather than restating a documented default.

The `no header` row is the baseline already covered by COND-GET-BOOK-001, not re-tested here — the same reference-only convention used in COND-DELETE-BOOKS-009's decision table.

---

## Infeasible conditions

### COND-GET-BOOK-INF-001: ISBN length and checksum boundaries (infeasible)

| Field      | Value                 |
| ---------- | --------------------- |
| ID         | COND-GET-BOOK-INF-001 |
| Priority   | Low                   |
| Category   | Input field           |
| Technique  | BVA                   |
| Source     | Spec gap              |
| Test cases | —                     |

**What to cover**
Whether `ISBN` has a documented length (10 vs. 13 digits) or checksum rule, and how a value one digit short or with a bad check digit is handled.

**Why infeasible**
No length, format, or checksum constraint is documented in Swagger or the live-verified spec doc, and the 2026-09-06 live check confirmed none is enforced: every non-catalogue value — malformed, wrong length, or well-formed — returns the same `400`/`1205`. There is no boundary to test because the endpoint has no format rule to bound; validity is membership in the catalogue, full stop.

**Mitigation**
The membership question is fully covered by COND-GET-BOOK-002 (unknown) and COND-GET-BOOK-004 (malformed). The one genuinely reachable boundary — the empty string — is covered by COND-GET-BOOK-003. Same gap and same reasoning already recorded for `isbn` in `post-books.md`.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                             |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — `ISBN` via COND-GET-BOOK-001                                                                                                                 |
| Does every required input field have at least one invalid EP condition?                | Yes — `ISBN`: 002 (unknown), 003 (empty), 004 (malformed: non-numeric and whitespace), 005 (absent), 006 (wrong casing)                            |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes — empty (003) is the one reachable boundary; length/checksum boundaries deferred as INF-001 since no format rule exists to bound               |
| Does every authorization state produce a distinct condition?                           | Yes — unauthenticated baseline (001) and bogus-token-ignored (007). No `401` state is reachable on this endpoint, which is itself what 007 asserts |
| Are all infeasible conditions documented?                                              | Yes — INF-001                                                                                                                                      |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                            |
| Are all conditions independently testable?                                             | Yes — every condition is a single stateless GET against the shared catalogue; none creates state or depends on another having run                  |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — the `200` status, bare-object shape, and field-value assertions are folded into 001 rather than split, per the merge rule                     |

**Analysis-to-condition mapping**

- Happy path (valid ISBN → 200, bare BookModal, correct book) → COND-GET-BOOK-001
- Negative: unknown ISBN → COND-GET-BOOK-002
- Negative: empty ISBN → COND-GET-BOOK-003
- Negative: malformed ISBN (non-numeric **and** whitespace-only — one class, two representatives) → COND-GET-BOOK-004
- Negative: absent ISBN param → COND-GET-BOOK-005
- Negative: lowercase `isbn` param → COND-GET-BOOK-006
- Boundary: `ISBN` zero-length → COND-GET-BOOK-003; length/checksum → COND-GET-BOOK-INF-001
- Authorization states: unauthenticated → COND-GET-BOOK-001; bogus token ignored → COND-GET-BOOK-007
- Status codes/response shape: `200` bare object → 001, 007; `400`/`1205` → 002, 003, 004; `500` HTML → 005, 006
- Spec ambiguities: ISBN handling resolved 2026-09-06 → 002–005; casing resolved → 006; auth resolved → 007; format rule → INF-001

**Coverage gaps identified**

- `ISBN` length/checksum validation — deferred as COND-GET-BOOK-INF-001, since the endpoint enforces no format rule to test against.

**Deferred conditions**

- COND-GET-BOOK-INF-001 — above.
