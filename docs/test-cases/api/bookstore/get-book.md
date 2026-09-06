# Test Cases — GET /BookStore/v1/Book

Generated from `docs/test-conditions/api/bookstore/get-book.md`.

Every case here is a read-only, unauthenticated request against the shared catalogue: nothing is created, nothing needs cleanup, and no case carries `Risk-1`. `Risk-4` likewise does not apply — GET-BOOK-007 sends a bogus token, but the point of that case is that the endpoint has **no** authorization decision to be inconsistent about.

Three behaviors established by the 2026-09-06 live check apply across the cases below:

- An **absent** `ISBN` query parameter returns `500` with a leaked Sequelize stack trace, while an **empty** one returns a handled `400`/`1205`. This is the one place on this endpoint where absent and empty diverge.
- The query parameter is **case-sensitive** — `?isbn=` is treated exactly as if it were absent.
- Every invalid-but-present `ISBN` (empty, whitespace, non-numeric, unknown) collapses to the same `400`/`1205` response. Validity is catalogue membership, not string format.

---

### TC: Get a book by a valid catalogue ISBN

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| ID             | GET-BOOK-001                                                       |
| Condition      | COND-GET-BOOK-001                                                  |
| Risk           | —                                                                  |
| Preconditions  | None                                                               |
| Test data      | ISBN: "9781449325862" (Git Pocket Guide — a known catalogue entry) |
| Postconditions | None — read-only request, no state created                         |
| Automation     | Not automated                                                      |

**Steps & expected results**

| #   | Action                                                                        | Expected result                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /BookStore/v1/Book?ISBN=9781449325862 with no `Authorization` header | Status 200; body is a bare `BookModal` object (not wrapped in a `books` array); `isbn` equals "9781449325862"; `title` equals "Git Pocket Guide"; `author` equals "Richard E. Silverman"; `pages` is a number |

**Notes**
Asserting `isbn` and `title` against their known values — rather than merely checking the fields are non-empty — is what lets this case detect the endpoint returning the _wrong_ book.

The bare-object shape matters: the sibling `GET /BookStore/v1/Books` wraps its result in `{ books: [...] }`, so a regression that wrapped this response would be a genuine contract break.

---

### TC: Get a book by a well-formed but unknown ISBN

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| ID             | GET-BOOK-002                                                    |
| Condition      | COND-GET-BOOK-002                                               |
| Risk           | —                                                               |
| Preconditions  | None                                                            |
| Test data      | ISBN: "0000000000000" (13 digits, not present in the catalogue) |
| Postconditions | None — read-only request, no state created                      |
| Automation     | Not automated                                                   |

**Steps & expected results**

| #   | Action                                                                        | Expected result                                                                                                                              |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /BookStore/v1/Book?ISBN=0000000000000 with no `Authorization` header | Status 400; body is `{ "code": "1205", "message": "ISBN supplied is not available in Books Collection!" }`; `code` is a string, not a number |

**Notes**
The same "not a real book" value used by POST-BOOKS-008 against the same catalogue, so both endpoints agree on what an unknown ISBN means.

---

### TC: Get a book with an empty ISBN parameter

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| ID             | GET-BOOK-003                                                                |
| Condition      | COND-GET-BOOK-003                                                           |
| Risk           | —                                                                           |
| Preconditions  | None                                                                        |
| Test data      | ISBN: "" (parameter present in the query string but with no value, 0 chars) |
| Postconditions | None — read-only request, no state created                                  |
| Automation     | Not automated                                                               |

**Steps & expected results**

| #   | Action                                                           | Expected result                                                                                                                                                    |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Send GET /BookStore/v1/Book?ISBN= with no `Authorization` header | Status 400 (not 500); body is `{ "code": "1205", "message": "ISBN supplied is not available in Books Collection!" }`, a JSON object rather than an HTML error page |

**Notes**
The zero-length boundary of the `ISBN` parameter. The "not 500" half is the substantive part: this is the one input on this endpoint where present-but-empty is handled while absent (GET-BOOK-005) crashes, so the boundary is meaningful rather than a formality.

---

### TC: Get a book with a malformed ISBN

| Field          | Value                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------- |
| ID             | GET-BOOK-004                                                                                    |
| Condition      | COND-GET-BOOK-004                                                                               |
| Risk           | —                                                                                               |
| Preconditions  | None                                                                                            |
| Test data      | ISBN — non-numeric: "not-an-isbn" / ISBN — whitespace-only: " " (a single space, sent as `%20`) |
| Postconditions | None — read-only request, no state created                                                      |
| Automation     | Not automated                                                                                   |

**Steps & expected results**

| #   | Action                                                                      | Expected result                                                                                            |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /BookStore/v1/Book?ISBN=not-an-isbn with no `Authorization` header | Status 400; body is `{ "code": "1205", "message": "ISBN supplied is not available in Books Collection!" }` |
| 2   | Send GET /BookStore/v1/Book?ISBN=%20 with no `Authorization` header         | Status 400; body identical to step 1 — same code and message                                               |

**Notes**
Two representatives of one invalid class: both are "a present value that is not a catalogue ISBN", and the endpoint does no format validation to distinguish them — live-verified 2026-09-06 as byte-identical.

Its condition is Low priority, so this case is expected to be skipped by the automation priority filter and to stay `Not automated`. The response is byte-identical to GET-BOOK-002 and no separate format-validation code path exists to regress, so it carries the least new information of any case in this file.

---

### TC: Get a book with the ISBN query parameter absent

| Field          | Value                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| ID             | GET-BOOK-005                                                                                         |
| Condition      | COND-GET-BOOK-005                                                                                    |
| Risk           | —                                                                                                    |
| Preconditions  | None                                                                                                 |
| Test data      | URL: `/BookStore/v1/Book` with no `?ISBN=` segment at all — the parameter is omitted, not sent empty |
| Postconditions | None — read-only request, no state created                                                           |
| Automation     | Not automated                                                                                        |

**Steps & expected results**

| #   | Action                                                                          | Expected result                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /BookStore/v1/Book (no query parameter) with no `Authorization` header | Status 500; response body is an HTML error page containing a Sequelize stack trace (`WHERE parameter "isbn" has invalid "undefined" value`), not a JSON error object |

**Notes**
Pins current (defective) behavior so a future fix to a validated 400 surfaces as an intentional change rather than a silent one. Same rationale as POST-BOOKS-004/005.

Distinct from GET-BOOK-003: an absent parameter and an empty one behave differently here. The leaked stack trace is an information-disclosure smell worth having on record.

The automated version needs a raw request — the typed client makes `isbn` mandatory.

---

### TC: Get a book using a lowercase isbn parameter

| Field          | Value                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------- |
| ID             | GET-BOOK-006                                                                              |
| Condition      | COND-GET-BOOK-006                                                                         |
| Risk           | —                                                                                         |
| Preconditions  | None                                                                                      |
| Test data      | Parameter spelled `isbn` (lowercase) with an otherwise valid value: `?isbn=9781449325862` |
| Postconditions | None — read-only request, no state created                                                |
| Automation     | Not automated                                                                             |

**Steps & expected results**

| #   | Action                                                                        | Expected result                                                                                                             |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /BookStore/v1/Book?isbn=9781449325862 with no `Authorization` header | Status 500 (not 200 with the book); response body is an HTML error page with the same Sequelize stack trace as GET-BOOK-005 |

**Notes**
Documents that the query parameter is case-sensitive — a reader might reasonably assume otherwise. Its condition is Low priority, so this case is expected to be skipped by the automation priority filter: nothing in the product spells the parameter wrong, and the response is byte-identical to GET-BOOK-005's.

---

### TC: Get a book with a bogus Authorization header

| Field          | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| ID             | GET-BOOK-007                                                             |
| Condition      | COND-GET-BOOK-007                                                        |
| Risk           | —                                                                        |
| Preconditions  | None                                                                     |
| Test data      | Header: `Authorization: Bearer not-a-real-token` / ISBN: "9781449325862" |
| Postconditions | None — read-only request, no state created                               |
| Automation     | Not automated                                                            |

**Steps & expected results**

| #   | Action                                                                                              | Expected result                                                                                               |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /BookStore/v1/Book?ISBN=9781449325862 with header `Authorization: Bearer not-a-real-token` | Status 200 (not 401); body is the same bare `BookModal` as GET-BOOK-001, with `isbn` equal to "9781449325862" |

**Notes**
The "not 401" expectation is the point: the identical token string returns `401`/`1200` on both `POST` and `DELETE /BookStore/v1/Books`, so this case pins the read/write asymmetry rather than restating a documented default. The header is not merely optional — it is never evaluated.

`Risk-4` deliberately not referenced: this is not a negative authorization scenario, because no authorization decision is made at all.

---

## Coverage summary

| Condition             | Test case(s) | Notes                                                                     |
| --------------------- | ------------ | ------------------------------------------------------------------------- |
| COND-GET-BOOK-001     | GET-BOOK-001 |                                                                           |
| COND-GET-BOOK-002     | GET-BOOK-002 |                                                                           |
| COND-GET-BOOK-003     | GET-BOOK-003 |                                                                           |
| COND-GET-BOOK-004     | GET-BOOK-004 | Low priority — expected to stay `Not automated` after the priority filter |
| COND-GET-BOOK-005     | GET-BOOK-005 |                                                                           |
| COND-GET-BOOK-006     | GET-BOOK-006 | Low priority — expected to stay `Not automated` after the priority filter |
| COND-GET-BOOK-007     | GET-BOOK-007 |                                                                           |
| COND-GET-BOOK-INF-001 | —            | Infeasible: no documented ISBN length/checksum rule exists to bound       |
