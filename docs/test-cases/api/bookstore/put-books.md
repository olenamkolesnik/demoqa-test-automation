# Test Cases — PUT /BookStore/v1/Books/{ISBN}

Generated from `docs/test-conditions/api/bookstore/put-books.md`.

Every case here seeds a user and mutates that user's book collection on the shared public backend, so all carry `Risk-1` and every one ends by deleting its user. The negative authorization cases (PUT-BOOKS-011, -012, -013) additionally carry `Risk-4`.

Four behaviors established by the 2026-09-06 live check apply across the cases below, each reproduced on two independent `qa_`-prefixed users:

- **Replacing a book with one the user already owns destroys a book.** `[A, B]` replacing `A` with `B` returns `200` and leaves `[B]`. PUT-BOOKS-009 pins this defect.
- **Replacing a book with itself is refused** with `400`/`1206` "not available in User's Collection" — a reason that contradicts the actual state. PUT-BOOKS-010 pins this.
- **This endpoint validates its body**, returning `400`/`1207` where `POST /BookStore/v1/Books` returns `500` with a stack trace for the same absent key.
- **`1206` is new to this resource** and means "not in _your_ collection", distinct from `1205`'s "not in the _catalogue_". The path `ISBN` is checked for collection membership before catalogue validity.

Two ISBN roles must be kept straight when reading these cases: the **path** `ISBN` names the book being replaced, the **body** `isbn` names its replacement. Several cases differ only in which of the two is invalid.

---

### TC: Replace a book the user does not own

| Field          | Value                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | PUT-BOOKS-001                                                                                                                              |
| Condition      | COND-PUT-BOOKS-001                                                                                                                         |
| Risk           | Risk-1                                                                                                                                     |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"                              |
| Test data      | Path ISBN: "9781449337711" (a real catalogue book the user does **not** own) / Body: `{ "userId": "<own UUID>", "isbn": "9781449331818" }` |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                                            |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                                        |

**Steps & expected results**

| #   | Action                                                                                                                                                    | Expected result                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449337711 with header `Authorization: Bearer <own token>` and body `{ "userId": "<own UUID>", "isbn": "9781449331818" }` | Status 400; body is `{ "code": "1206", "message": "ISBN supplied is not available in User's Collection!" }`; `code` is a string, not a number |
| 2   | Send GET /Account/v1/User/{userId} with the same token                                                                                                    | `books` contains exactly one entry, with `isbn` equal to "9781449325862" — neither the path ISBN nor the replacement was written              |

**Notes**
The endpoint's primary ownership check. `1206` appears on no other endpoint in this resource — every sibling's "wrong ISBN" case is `1205` — so asserting the message alongside the code is what distinguishes the two.

Step 2 is what separates a genuine rejection from a `400` returned after the write already happened; the status code alone would not catch that.

---

### TC: Replace a book using a path ISBN unknown to the catalogue

| Field          | Value                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-002                                                                                                         |
| Condition      | COND-PUT-BOOKS-002                                                                                                    |
| Risk           | Risk-1                                                                                                                |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"         |
| Test data      | Path ISBN: "0000000000000" (13 digits, in no catalogue) / Body: `{ "userId": "<own UUID>", "isbn": "9781449331818" }` |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                       |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                   |

**Steps & expected results**

| #   | Action                                                                                                                                                    | Expected result                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/0000000000000 with header `Authorization: Bearer <own token>` and body `{ "userId": "<own UUID>", "isbn": "9781449331818" }` | Status 400; body is `{ "code": "1206", "message": "ISBN supplied is not available in User's Collection!" }` — **not** `1205`, and not the "Books Collection" message |

**Notes**
The "not `1205`" expectation is the substantive part. `GET /BookStore/v1/Book` and `POST /BookStore/v1/Books` both answer this same ISBN with `1205`, so the reasonable prior is that this endpoint would too — it does not, because collection membership is checked before catalogue validity.

Same `0000000000000` value as POST-BOOKS-008 and GET-BOOK-002 against the same catalogue, so all three endpoints agree on what an unknown ISBN means.

---

### TC: Replace a book with an ISBN unknown to the catalogue

| Field          | Value                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-003                                                                                                           |
| Condition      | COND-PUT-BOOKS-003                                                                                                      |
| Risk           | Risk-1                                                                                                                  |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"           |
| Test data      | Path ISBN: "9781449325862" (a book the user **does** own) / Body: `{ "userId": "<own UUID>", "isbn": "0000000000000" }` |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                         |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                     |

**Steps & expected results**

| #   | Action                                                                                                                                                    | Expected result                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "userId": "<own UUID>", "isbn": "0000000000000" }` | Status 400; body is `{ "code": "1205", "message": "ISBN supplied is not available in Books Collection!" }` — `1205`, not `1206` |
| 2   | Send GET /Account/v1/User/{userId} with the same token                                                                                                    | `books` contains exactly one entry, with `isbn` equal to "9781449325862" — the owned book was not removed                       |

**Notes**
The counterpart to PUT-BOOKS-002, and the reason both exist: the _same_ unknown ISBN `0000000000000` produces `1206` in the path and `1205` in the body. Either case alone would leave that asymmetry unrecorded.

The path ISBN here is deliberately one the user owns, so the only invalid element is the body `isbn` — otherwise the `1206` check would fire first and this case would never reach the catalogue validation it exists to test.

---

### TC: Replace a book with an empty userId

| Field          | Value                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-004                                                                                                 |
| Condition      | COND-PUT-BOOKS-004                                                                                            |
| Risk           | Risk-1                                                                                                        |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862" |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "userId": "", "isbn": "9781449331818" }` — `userId` present but 0 chars |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it               |
| Automation     | Automated → `put-books.api.spec.ts`                                                                           |

**Steps & expected results**

| #   | Action                                                                                                                                          | Expected result                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "userId": "", "isbn": "9781449331818" }` | Status 400 (not 401); body is `{ "code": "1207", "message": "Request Body is Invalid!" }` — not the "User Id not correct!" message |

**Notes**
The zero-length boundary of the required `userId` field. The status/message split is the whole point: on `DELETE /BookStore/v1/Books` an empty `UserId` returns `401`/"User Id not correct!" (DELETE-BOOKS-005), while the same empty value here returns `400`/"Request Body is Invalid!".

Asserting the code `1207` alone would pass against either endpoint's behavior and so would catch nothing — status, code, and message must all be asserted together. `1207` is overloaded three different ways across this resource.

---

### TC: Replace a book with a well-formed but unknown userId

| Field          | Value                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-005                                                                                                                                                        |
| Condition      | COND-PUT-BOOKS-005                                                                                                                                                   |
| Risk           | Risk-1                                                                                                                                                               |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"                                                        |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "userId": "11111111-2222-3333-4444-555555555555", "isbn": "9781449331818" }` — a syntactically valid UUID belonging to no user |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                                                                      |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                                                                  |

**Steps & expected results**

| #   | Action                                                                                                                                                                              | Expected result                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "userId": "11111111-2222-3333-4444-555555555555", "isbn": "9781449331818" }` | Status 401 (not 400); body is `{ "code": "1207", "message": "User Id not correct!" }` — not the "Request Body is Invalid!" message |

**Notes**
Paired deliberately with PUT-BOOKS-004: this endpoint splits an empty `userId` from an unknown one across two different statuses _and_ two different messages under the same `1207` code, where `DELETE /BookStore/v1/Books` collapses them into one response. Both cases are needed to pin that split.

Uses the same unknown-UUID value already established for `POST` and `DELETE` on this resource.

---

### TC: Replace a book with the userId key absent from the body

| Field          | Value                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-006                                                                                                        |
| Condition      | COND-PUT-BOOKS-006                                                                                                   |
| Risk           | Risk-1                                                                                                               |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"        |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "isbn": "9781449331818" }` — the `userId` key omitted entirely, not sent empty |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                      |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                  |

**Steps & expected results**

| #   | Action                                                                                                                            | Expected result                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "isbn": "9781449331818" }` | Status 400 (not 500); body is `{ "code": "1207", "message": "Request Body is Invalid!" }`, a JSON object rather than an HTML error page with a stack trace |

**Notes**
The "not 500" half is the substantive part. `POST /BookStore/v1/Books` returns `500` with a Sequelize stack trace for an absent `userId` (POST-BOOKS-004), so the sibling-endpoint prior predicts a crash here — and is wrong. Three endpoints on this resource now handle an absent required field three different ways: `POST` crashes, `DELETE /Books` returns `401`/`1207`, `PUT` returns `400`/`1207`.

The automated version needs a raw request — the typed client makes `userId` mandatory.

---

### TC: Replace a book with the isbn key absent from the body

| Field          | Value                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-007                                                                                                 |
| Condition      | COND-PUT-BOOKS-007                                                                                            |
| Risk           | Risk-1                                                                                                        |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862" |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "userId": "<own UUID>" }` — the `isbn` key omitted entirely             |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it               |
| Automation     | Automated → `put-books.api.spec.ts`                                                                           |

**Steps & expected results**

| #   | Action                                                                                                                           | Expected result                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "userId": "<own UUID>" }` | Status 400 (not 500, not 1205); body is `{ "code": "1207", "message": "Request Body is Invalid!" }` |

**Notes**
Kept separate from PUT-BOOKS-006 because they omit different required fields. On `POST /BookStore/v1/Books` the two absent keys produce _different_ `500`s — a Sequelize trace for `userId`, a `TypeError` for `collectionOfIsbns` (POST-BOOKS-004/005) — so absent-key behavior on this resource has already been shown not to be uniform. Treating the two as one class here would assume the symmetry rather than test it.

The automated version needs a raw request, for the same reason as PUT-BOOKS-006.

---

### TC: Replace a book with an empty request body

| Field          | Value                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-014                                                                                                   |
| Condition      | COND-PUT-BOOKS-014                                                                                              |
| Risk           | Risk-1                                                                                                          |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"   |
| Test data      | Path ISBN: "9781449325862" / Body: `{}` — a valid JSON object with zero fields; both `userId` and `isbn` absent |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                 |
| Automation     | Automated → `put-books.api.spec.ts`                                                                             |

**Steps & expected results**

| #   | Action                                                                                                   | Expected result                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{}` | Status 400 (not 500); body is `{ "code": "1207", "message": "Request Body is Invalid!" }`, not an HTML error page |

**Notes**
The zero-field boundary of the request body itself, below PUT-BOOKS-006 and -007 which each omit one key while the other is still present. Kept separate for the same reason those two are separate from each other: this resource has already demonstrated that absent-key handling is not uniform, so equivalence has to be tested rather than assumed.

Placed here, after PUT-BOOKS-007, because it belongs with the other body-validity cases; its ID is 014 because IDs are allocated in append-only order and 008–013 were assigned before this case was added during stage 1's review.

The automated version needs a raw request — the typed client requires both fields.

---

### TC: Replace an owned book with a new book

| Field          | Value                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-008                                                                                                                             |
| Condition      | COND-PUT-BOOKS-008                                                                                                                        |
| Risk           | Risk-1                                                                                                                                    |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly two books: "9781449325862" and "9781449337711"        |
| Test data      | Path ISBN: "9781449325862" (owned) / Body: `{ "userId": "<own UUID>", "isbn": "9781449331818" }` (a catalogue book the user does not own) |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                                           |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                                       |

**Steps & expected results**

| #   | Action                                                                                                                                                    | Expected result                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "userId": "<own UUID>", "isbn": "9781449331818" }` | Status 200; body is `{ userId, username, books }` with `userId` (lowercase) equal to the own UUID and `username` equal to the seeded user name; `books` holds exactly two entries whose ISBNs are "9781449331818" and "9781449337711", and does not contain "9781449325862" |
| 2   | Send GET /Account/v1/User/{userId} with the same token                                                                                                    | `books` holds the same two ISBNs — "9781449331818" and "9781449337711" — confirming the replacement persisted                                                                                                                                                               |

**Notes**
Seeding two books rather than one is deliberate and load-bearing: with a single book, "replaced the named book" and "replaced the entire collection" are indistinguishable outcomes. The untouched "9781449337711" is what proves the operation is scoped to one entry.

Asserting the collection size stays at **two** matters as much as asserting membership — the defect this endpoint actually has (PUT-BOOKS-009) is a silent size reduction, so a check of "contains the new ISBN" alone would pass while a book vanished.

Assert membership, not position: the `200` body and the step-2 read-back list the same books in different orders, and no ordering guarantee is documented.

---

### TC: Replace an owned book with another book the user already owns

| Field          | Value                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | PUT-BOOKS-009                                                                                                                                                      |
| Condition      | COND-PUT-BOOKS-009                                                                                                                                                 |
| Risk           | Risk-1                                                                                                                                                             |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly two books: "9781449325862" and "9781449337711"                                 |
| Test data      | Path ISBN: "9781449325862" (owned) / Body: `{ "userId": "<own UUID>", "isbn": "9781449337711" }` — the replacement is the **other** book already in the collection |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                                                                    |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                                                                |

**Steps & expected results**

| #   | Action                                                                                                                                                    | Expected result                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "userId": "<own UUID>", "isbn": "9781449337711" }` | Status 200 (not 400/1210); response body's `books` lists "9781449337711" **twice** — the response itself misreports the collection size, not merely stale or reordered |
| 2   | Send GET /Account/v1/User/{userId} with the same token                                                                                                    | `books` holds exactly **one** entry, "9781449337711" — confirming a book was permanently destroyed, and that the response body's count of two is not the real state    |

**Notes**
**This pins a defect, not correct behavior.** The expected results deliberately encode what the endpoint _does_, so that a future fix surfaces as an intentional change rather than a silent one — the same rationale as POST-BOOKS-004/005 and GET-BOOK-005.

The "not 400/1210" expectation records what a correct implementation would plausibly return: `POST /BookStore/v1/Books` already has `1210` "ISBN already present in the User's Collection!" for exactly this situation and does not reuse it here.

**The response body is not a trustworthy record of the collection here** — live-verified 2026-09-06 (surfaced by the automated test's first run, then reproduced independently): the `200` body echoes the surviving ISBN twice, while the real persisted state (step 2) holds it once. The **count** assertion belongs on the step-2 read-back, not the response body; asserting size against the response alone would report a _different_ wrong number (two) than the truth (one), which is worse than an assertion that simply misses the defect. Step 2 is what proves the loss is real rather than a reporting artifact — and, here, what the reporting artifact itself looks like.

Distinct from PUT-BOOKS-008 in outcome, not just input: both start from the same two-book collection, 008 preserves the size and 009 reduces it, which is what makes the contrast legible.

---

### TC: Replace a book with itself

| Field          | Value                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-010                                                                                                                      |
| Condition      | COND-PUT-BOOKS-010                                                                                                                 |
| Risk           | Risk-1                                                                                                                             |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"                      |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "userId": "<own UUID>", "isbn": "9781449325862" }` — path and body ISBN identical, and owned |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                                    |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                                |

**Steps & expected results**

| #   | Action                                                                                                                                                    | Expected result                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <own token>` and body `{ "userId": "<own UUID>", "isbn": "9781449325862" }` | Status 400 (not 200); body is `{ "code": "1206", "message": "ISBN supplied is not available in User's Collection!" }` — despite the book being present |
| 2   | Send GET /Account/v1/User/{userId} with the same token                                                                                                    | `books` still contains exactly one entry, "9781449325862" — the rejected no-op did not remove the book                                                 |

**Notes**
**This pins a defect.** The response's stated reason is factually wrong: the book _is_ in the user's collection, as the seeding step and step 2 both confirm. Reproduced on two users, each verified to own the ISBN immediately beforehand, which rules out a stale-state explanation.

The zero-change boundary of the replacement input — the degenerate case of PUT-BOOKS-008. Distinct from PUT-BOOKS-001, where the same `1206` is _correct_: one truthful use of the code and one false one, which is exactly why both cases exist.

Step 2 matters given PUT-BOOKS-009's data loss: a rejected no-op that nonetheless removed the book would be the worse failure, and only an explicit read-back rules it out.

---

### TC: Replace a book without an Authorization header

| Field          | Value                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-011                                                                                                             |
| Condition      | COND-PUT-BOOKS-011                                                                                                        |
| Risk           | Risk-1, Risk-4                                                                                                            |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"             |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "userId": "<own UUID>", "isbn": "9781449331818" }` / No `Authorization` header sent |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                           |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                       |

**Steps & expected results**

| #   | Action                                                                                                                                       | Expected result                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with **no** `Authorization` header and body `{ "userId": "<own UUID>", "isbn": "9781449331818" }` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }`                |
| 2   | Send GET /Account/v1/User/{userId} with the seeded user's token                                                                              | `books` still contains exactly one entry, "9781449325862" — the replacement did not happen |

**Notes**
An authorization gap on a mutating endpoint means unauthenticated data modification, not merely an information leak — the same basis on which DELETE-BOOKS-007 is treated as high-value.

Step 2 is what makes the case meaningful: a `401` that performed the swap anyway would be the real defect, and the status code alone would not catch it.

---

### TC: Replace a book with a malformed token

| Field          | Value                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-012                                                                                                                               |
| Condition      | COND-PUT-BOOKS-012                                                                                                                          |
| Risk           | Risk-1, Risk-4                                                                                                                              |
| Preconditions  | User account exists with a token generated, and the user's collection holds exactly one book: "9781449325862"                               |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "userId": "<own UUID>", "isbn": "9781449331818" }` / Header: `Authorization: Bearer not-a-real-token` |
| Postconditions | User account deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                                             |
| Automation     | Automated → `put-books.api.spec.ts`                                                                                                         |

**Steps & expected results**

| #   | Action                                                                                                                                                         | Expected result                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer not-a-real-token` and body `{ "userId": "<own UUID>", "isbn": "9781449331818" }` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }` |

**Notes**
Kept separate from PUT-BOOKS-011 despite the identical response — present-but-invalid credentials and absent credentials are distinct invalid classes, the same precedent as DELETE-BOOKS-007/008 and POST-BOOKS-011/012.

Uses the same `not-a-real-token` literal as the sibling endpoints' malformed-token cases.

---

### TC: Replace a book in another user's collection

| Field          | Value                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | PUT-BOOKS-013                                                                                                                                             |
| Condition      | COND-PUT-BOOKS-013                                                                                                                                        |
| Risk           | Risk-1, Risk-4                                                                                                                                            |
| Preconditions  | **Two** user accounts exist, each with a token generated. User B's collection holds exactly one book: "9781449325862". User A's collection is irrelevant. |
| Test data      | Path ISBN: "9781449325862" / Body: `{ "userId": "<user B's UUID>", "isbn": "9781449331818" }` / Header: `Authorization: Bearer <user A's token>`          |
| Postconditions | Both user accounts deleted via DELETE /Account/v1/User/{userId}                                                                                           |
| Automation     | Not automated                                                                                                                                             |

**Steps & expected results**

| #   | Action                                                                                                                                                              | Expected result                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Send PUT /BookStore/v1/Books/9781449325862 with header `Authorization: Bearer <user A's token>` and body `{ "userId": "<user B's UUID>", "isbn": "9781449331818" }` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }`                                |
| 2   | Send GET /Account/v1/User/{user B's userId} with user B's own token                                                                                                 | `books` still contains exactly one entry, "9781449325862" — user B's collection was not modified by user A |

**Notes**
The condition that would catch a genuine privilege-escalation regression rather than a validation slip — and on this endpoint the escalation modifies another user's data rather than merely reading it. Live-verified 2026-09-06; undocumented in Swagger and absent from the spec doc before that check.

Step 2 is load-bearing for the same reason as in PUT-BOOKS-011: the status code alone would not catch a replacement that happened anyway.

**This case needs two independently seeded users**, which `generate-api-tests` does not currently support. It is expected to remain `Not automated` after stage 4 — the same outcome as DELETE-BOOKS-009. Its condition is High priority: the limitation is in the generator, not in the case's importance, and the priority filter must not be used to paper over it.

---

## Coverage summary

| Condition              | Test case(s)  | Notes                                                                                            |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| COND-PUT-BOOKS-001     | PUT-BOOKS-001 |                                                                                                  |
| COND-PUT-BOOKS-002     | PUT-BOOKS-002 |                                                                                                  |
| COND-PUT-BOOKS-003     | PUT-BOOKS-003 |                                                                                                  |
| COND-PUT-BOOKS-004     | PUT-BOOKS-004 |                                                                                                  |
| COND-PUT-BOOKS-005     | PUT-BOOKS-005 |                                                                                                  |
| COND-PUT-BOOKS-006     | PUT-BOOKS-006 | Needs a raw request — the typed client makes `userId` mandatory                                  |
| COND-PUT-BOOKS-007     | PUT-BOOKS-007 | Needs a raw request — the typed client makes `isbn` mandatory                                    |
| COND-PUT-BOOKS-008     | PUT-BOOKS-008 |                                                                                                  |
| COND-PUT-BOOKS-009     | PUT-BOOKS-009 | Pins a defect: silent data loss                                                                  |
| COND-PUT-BOOKS-010     | PUT-BOOKS-010 | Pins a defect: false rejection reason                                                            |
| COND-PUT-BOOKS-011     | PUT-BOOKS-011 |                                                                                                  |
| COND-PUT-BOOKS-012     | PUT-BOOKS-012 |                                                                                                  |
| COND-PUT-BOOKS-013     | PUT-BOOKS-013 | Multi-actor — expected to stay `Not automated`; `generate-api-tests` refuses two-user test cases |
| COND-PUT-BOOKS-014     | PUT-BOOKS-014 | Needs a raw request — the typed client requires both fields                                      |
| COND-PUT-BOOKS-INF-001 | —             | Infeasible: token expiry cannot be reached within a suite run                                    |
