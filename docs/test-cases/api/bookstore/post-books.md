# Test Cases — POST /BookStore/v1/Books

Generated from `docs/test-conditions/api/bookstore/post-books.md`.

All test cases create a user on the shared public backend and therefore carry `Risk-1`; negative authorization cases additionally carry `Risk-4`. Every case that creates a user deletes it in its postconditions.

Two behaviors established by the 2026-09-05 live check apply across several cases below:

- The `201` response body echoes submitted ISBNs but is **not** a reliable record of what was stored — persistence is verified by reading the collection back via `GET /Account/v1/User/{userId}`.
- Error code `1207` appears under two different statuses with two different messages on this endpoint, so status, code, and message are always asserted together.

---

### TC: Add a single valid book to the user's own collection

| Field          | Value                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | POST-BOOKS-001                                                                                                                        |
| Condition      | COND-POST-BOOKS-001                                                                                                                   |
| Risk           | Risk-1                                                                                                                                |
| Preconditions  | User account exists with an empty collection (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | userId: the created user's `userId` / isbn: "9781449325862" (present in the catalogue, not yet in the user's collection)              |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}, which removes the collection with it                                               |
| Automation     | Not automated                                                                                                                         |

**Steps & expected results**

| #   | Action                                                                                                                                                            | Expected result                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "<userId>", "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 201; body is `{ "books": [{ "isbn": "9781449325862" }] }`; `books` has exactly 1 entry |
| 2   | Send GET /Account/v1/User/{userId} with header `Authorization: Bearer <token>`                                                                                    | Status 200; `books` array contains exactly one book whose `isbn` is "9781449325862"           |

**Notes**
Step 2 is not redundant with step 1 — POST-BOOKS-009 shows the `201` body can echo an ISBN that was never stored, so the read-back is what actually proves the write.

---

### TC: Add two valid books in a single request

| Field          | Value                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | POST-BOOKS-002                                                                                                                             |
| Condition      | COND-POST-BOOKS-002                                                                                                                        |
| Risk           | Risk-1                                                                                                                                     |
| Preconditions  | User account exists with an empty collection (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken)      |
| Test data      | userId: the created user's `userId` / isbn 1: "9781449331818" / isbn 2: "9781449337711" (both in the catalogue, neither in the collection) |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}                                                                                          |
| Automation     | Not automated                                                                                                                              |

**Steps & expected results**

| #   | Action                                                                                                                                                                                         | Expected result                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "<userId>", "collectionOfIsbns": [{ "isbn": "9781449331818" }, { "isbn": "9781449337711" }] }` | Status 201; body `books` has exactly 2 entries, with `isbn` values "9781449331818" and "9781449337711" |
| 2   | Send GET /Account/v1/User/{userId} with header `Authorization: Bearer <token>`                                                                                                                 | Status 200; `books` contains both "9781449331818" and "9781449337711"                                  |

**Notes**
Covers the "many" class of the `collectionOfIsbns` array. No documented upper bound exists — see COND-POST-BOOKS-INF-001.

---

### TC: Add books with an empty collectionOfIsbns array

| Field          | Value                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| ID             | POST-BOOKS-003                                                                                               |
| Condition      | COND-POST-BOOKS-003                                                                                          |
| Risk           | Risk-1                                                                                                       |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | userId: the created user's `userId` / collectionOfIsbns: `[]` (present, well-typed, zero items)              |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no book added                                             |
| Automation     | Not automated                                                                                                |

**Steps & expected results**

| #   | Action                                                                                                                                 | Expected result                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "<userId>", "collectionOfIsbns": [] }` | Status 400; body is `{ "code": "1207", "message": "Collection of books required." }`; `code` is a string |

**Notes**
Assert status, code, and message together — `1207` is also returned by POST-BOOKS-006 and POST-BOOKS-007 under status 401 with a different message.

---

### TC: Add books with the collectionOfIsbns key absent from the body

| Field          | Value                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| ID             | POST-BOOKS-004                                                                                               |
| Condition      | COND-POST-BOOKS-004                                                                                          |
| Risk           | Risk-1                                                                                                       |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | Body: `{ "userId": "<userId>" }` — the `collectionOfIsbns` key is omitted entirely, not sent as `[]`         |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no book added                                             |
| Automation     | Not automated                                                                                                |

**Steps & expected results**

| #   | Action                                                                                                        | Expected result                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "<userId>" }` | Status 500; response body is an HTML error page containing a `TypeError` stack trace, not a JSON error object |

**Notes**
Pins current (defective) behavior so a future fix to a validated 400 surfaces as an intentional change rather than a silent one. Distinct from POST-BOOKS-003: an absent key and an empty array behave differently on this endpoint. The automated version needs a raw request — the typed client makes `collectionOfIsbns` mandatory.

---

### TC: Add books with the userId key absent from the body

| Field          | Value                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| ID             | POST-BOOKS-005                                                                                               |
| Condition      | COND-POST-BOOKS-005                                                                                          |
| Risk           | Risk-1                                                                                                       |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | Body: `{ "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` — the `userId` key is omitted entirely        |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no book added                                             |
| Automation     | Not automated                                                                                                |

**Steps & expected results**

| #   | Action                                                                                                                                      | Expected result                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 500; response body is an HTML error page containing a Sequelize stack trace, not a JSON error object |

**Notes**
Same defect-pinning rationale as POST-BOOKS-004, and likewise requires a raw request. Distinct from POST-BOOKS-006, where a present-but-empty `userId` is handled and returns 401/1207.

---

### TC: Add books with an empty-string userId

| Field          | Value                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| ID             | POST-BOOKS-006                                                                                               |
| Condition      | COND-POST-BOOKS-006                                                                                          |
| Risk           | Risk-1, Risk-4                                                                                               |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | userId: "" (empty string, 0 chars) / isbn: "9781449325862"                                                   |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no book added                                             |
| Automation     | Not automated                                                                                                |

**Steps & expected results**

| #   | Action                                                                                                                                                    | Expected result                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "", "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 401 (not 400); body is `{ "code": "1207", "message": "User Id not correct!" }` |

**Notes**
The 401-rather-than-400 status is the point of the case: a client branching on status alone would misread a body-validation failure as an authentication problem.

---

### TC: Add books with a well-formed but unknown userId

| Field          | Value                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| ID             | POST-BOOKS-007                                                                                                 |
| Condition      | COND-POST-BOOKS-007                                                                                            |
| Risk           | Risk-1, Risk-4                                                                                                 |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken)   |
| Test data      | userId: "11111111-2222-3333-4444-555555555555" (valid UUID format, belongs to no user) / isbn: "9781449325862" |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no book added                                               |
| Automation     | Not automated                                                                                                  |

**Steps & expected results**

| #   | Action                                                                                                                                                                                        | Expected result                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "11111111-2222-3333-4444-555555555555", "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 401; body is `{ "code": "1207", "message": "User Id not correct!" }` |

**Notes**
Response is identical to POST-BOOKS-006, but the input class is genuinely different (empty vs. well-formed-but-unknown), so both are kept.

---

### TC: Add a book with an ISBN not present in the catalogue

| Field          | Value                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| ID             | POST-BOOKS-008                                                                                               |
| Condition      | COND-POST-BOOKS-008                                                                                          |
| Risk           | Risk-1                                                                                                       |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | userId: the created user's `userId` / isbn: "0000000000000" (not in the catalogue), sole item in the batch   |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no book added                                             |
| Automation     | Not automated                                                                                                |

**Steps & expected results**

| #   | Action                                                                                                                                                            | Expected result                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "<userId>", "collectionOfIsbns": [{ "isbn": "0000000000000" }] }` | Status 400; body is `{ "code": "1205", "message": "ISBN supplied is not available in Books Collection!" }` |

**Notes**
The unknown ISBN being the **only** item in the batch is essential — the same ISBN alongside a valid one returns 201 instead (POST-BOOKS-009).

---

### TC: Add a batch mixing a valid and an unknown ISBN

| Field          | Value                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | POST-BOOKS-009                                                                                                                        |
| Condition      | COND-POST-BOOKS-009                                                                                                                   |
| Risk           | Risk-1                                                                                                                                |
| Preconditions  | User account exists with an empty collection (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | userId: the created user's `userId` / valid isbn: "9781449325862" / unknown isbn: "0000000000000", both in one batch                  |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}                                                                                     |
| Automation     | Not automated                                                                                                                         |

**Steps & expected results**

| #   | Action                                                                                                                                                                                         | Expected result                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "<userId>", "collectionOfIsbns": [{ "isbn": "9781449325862" }, { "isbn": "0000000000000" }] }` | Status 201; body `books` has 2 entries, echoing **both** "9781449325862" and "0000000000000"                 |
| 2   | Send GET /Account/v1/User/{userId} with header `Authorization: Bearer <token>`                                                                                                                 | Status 200; `books` contains "9781449325862" only — "0000000000000" is absent despite being echoed in step 1 |

**Notes**
Documents current behavior rather than endorsing it: the batch is not atomic and the 201 body misreports what was stored. This is the case that justifies the read-back step in POST-BOOKS-001 and POST-BOOKS-002.

---

### TC: Add a book already present in the user's collection

| Field          | Value                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | POST-BOOKS-010                                                                                                                        |
| Condition      | COND-POST-BOOKS-010                                                                                                                   |
| Risk           | Risk-1                                                                                                                                |
| Preconditions  | User account exists and token generated; the user's collection already contains "9781449325862" (seeded via POST /BookStore/v1/Books) |
| Test data      | userId: the created user's `userId` / isbn: "9781449325862" — the same ISBN already in the collection                                 |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection still contains exactly one copy of "9781449325862" until deletion       |
| Automation     | Not automated                                                                                                                         |

**Steps & expected results**

| #   | Action                                                                                                                                                            | Expected result                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <token>` and body `{ "userId": "<userId>", "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 400; body is `{ "code": "1210", "message": "ISBN already present in the User's Collection!" }` |

**Notes**
The endpoint is not idempotent — a repeat submission is an error, not a no-op. The precondition is seeded independently, so this case does not depend on POST-BOOKS-001 having run.

---

### TC: Add a book without an Authorization header

| Field          | Value                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------- |
| ID             | POST-BOOKS-011                                                                               |
| Condition      | COND-POST-BOOKS-011                                                                          |
| Risk           | Risk-1, Risk-4                                                                               |
| Preconditions  | User account exists with an empty collection (created via POST /Account/v1/User)             |
| Test data      | userId: the created user's `userId` / isbn: "9781449325862" / no `Authorization` header sent |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection remains empty                  |
| Automation     | Not automated                                                                                |

**Steps & expected results**

| #   | Action                                                                                                                                                   | Expected result                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with **no** `Authorization` header and body `{ "userId": "<userId>", "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }` |
| 2   | Send GET /Account/v1/User/{userId} with a valid token for that user                                                                                      | Status 200; `books` is empty — the rejected request added nothing           |

**Notes**
None.

---

### TC: Add a book with a malformed bearer token

| Field          | Value                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| ID             | POST-BOOKS-012                                                                                                 |
| Condition      | COND-POST-BOOKS-012                                                                                            |
| Risk           | Risk-1, Risk-4                                                                                                 |
| Preconditions  | User account exists (created via POST /Account/v1/User)                                                        |
| Test data      | Header: `Authorization: Bearer not-a-real-token` / userId: the created user's `userId` / isbn: "9781449325862" |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection remains empty                                    |
| Automation     | Not automated                                                                                                  |

**Steps & expected results**

| #   | Action                                                                                                                                                                     | Expected result                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer not-a-real-token` and body `{ "userId": "<userId>", "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }` |

**Notes**
Response is identical to POST-BOOKS-011, but absent credentials and malformed credentials are distinct invalid classes, so both are kept.

---

### TC: Add a book to another user's collection using own token

| Field          | Value                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | POST-BOOKS-013                                                                                                                                                       |
| Condition      | COND-POST-BOOKS-013                                                                                                                                                  |
| Risk           | Risk-1, Risk-4                                                                                                                                                       |
| Preconditions  | Two independent user accounts exist, user A and user B, each with an empty collection and a generated token (POST /Account/v1/User + POST /Account/v1/GenerateToken) |
| Test data      | Header: user A's token / userId: user B's `userId` / isbn: "9781449325862"                                                                                           |
| Postconditions | Both users deleted via DELETE /Account/v1/User/{userId}; user B's collection unchanged                                                                               |
| Automation     | Not automated                                                                                                                                                        |

**Steps & expected results**

| #   | Action                                                                                                                                                                          | Expected result                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send POST /BookStore/v1/Books with header `Authorization: Bearer <user A token>` and body `{ "userId": "<user B userId>", "collectionOfIsbns": [{ "isbn": "9781449325862" }] }` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }` |
| 2   | Send GET /Account/v1/User/{user B userId} with header `Authorization: Bearer <user B token>`                                                                                    | Status 200; `books` is empty — nothing was written to user B's collection   |

**Notes**
The highest-value negative case in this file: step 2 is what distinguishes a genuine authorization boundary from a rejection that happened to leave a side effect behind. Live-verified in both directions (A→B and B→A) on 2026-09-05.

---

## Coverage summary

| Condition               | Test case(s)   | Notes                                                      |
| ----------------------- | -------------- | ---------------------------------------------------------- |
| COND-POST-BOOKS-001     | POST-BOOKS-001 |                                                            |
| COND-POST-BOOKS-002     | POST-BOOKS-002 |                                                            |
| COND-POST-BOOKS-003     | POST-BOOKS-003 |                                                            |
| COND-POST-BOOKS-004     | POST-BOOKS-004 |                                                            |
| COND-POST-BOOKS-005     | POST-BOOKS-005 |                                                            |
| COND-POST-BOOKS-006     | POST-BOOKS-006 |                                                            |
| COND-POST-BOOKS-007     | POST-BOOKS-007 |                                                            |
| COND-POST-BOOKS-008     | POST-BOOKS-008 |                                                            |
| COND-POST-BOOKS-009     | POST-BOOKS-009 |                                                            |
| COND-POST-BOOKS-010     | POST-BOOKS-010 |                                                            |
| COND-POST-BOOKS-011     | POST-BOOKS-011 |                                                            |
| COND-POST-BOOKS-012     | POST-BOOKS-012 |                                                            |
| COND-POST-BOOKS-013     | POST-BOOKS-013 |                                                            |
| COND-POST-BOOKS-INF-001 | —              | Infeasible: no documented upper bound on batch size        |
| COND-POST-BOOKS-INF-002 | —              | Infeasible: expired-token state unreachable in a suite run |
