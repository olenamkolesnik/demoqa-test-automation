# Test Cases — DELETE /BookStore/v1/Books

Generated from `docs/test-conditions/api/bookstore/delete-books.md`.

All test cases create a user on the shared public backend and therefore carry `Risk-1`; negative authorization cases additionally carry `Risk-4`. Every case that creates a user deletes it in its postconditions.

`Risk-4` is scoped here to cases that exercise the credential itself — DELETE-BOOKS-007 (no header), 008 (malformed token), and 009 (cross-user). The invalid-`UserId` trio (004, 005, 006) returns `401` too, but as input validation on the identifier rather than an authorization decision, so it carries `Risk-1` only.

Three behaviors established by the 2026-09-06 live check apply across several cases below:

- The endpoint is **idempotent** — deleting an already-empty collection and repeating a successful delete both return `204`. This is the opposite of `DELETE /Account/v1/User/{UUID}`, which returns `200`/`1207` on a repeat.
- An **absent** `UserId` query parameter is handled (`401`/`1207`), not crashed into a `500` the way an absent key is on `POST /BookStore/v1/Books`.
- Error code `1207` is overloaded across this resource, so status, code, and message are always asserted together.

Success is `204` with a genuinely empty body — Swagger's `BooksResult` schema for this status is wrong, so the empty-body assertion is substantive rather than incidental.

---

### TC: Delete all books from the user's own populated collection

| Field          | Value                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | DELETE-BOOKS-001                                                                                                                                  |
| Condition      | COND-DELETE-BOOKS-004                                                                                                                             |
| Risk           | Risk-1                                                                                                                                            |
| Preconditions  | User account exists and token generated; the user's collection contains "9781449325862" and "9781449331818" (seeded via POST /BookStore/v1/Books) |
| Test data      | UserId: the created user's `userId` / seeded isbn 1: "9781449325862" / seeded isbn 2: "9781449331818"                                             |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection empty from step 1 until deletion                                                    |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                                                            |

**Steps & expected results**

| #   | Action                                                                                      | Expected result                                                                       |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books?UserId=<userId> with header `Authorization: Bearer <token>` | Status 204; response body is completely empty — no JSON payload of any kind           |
| 2   | Send GET /Account/v1/User/{userId} with header `Authorization: Bearer <token>`              | Status 200; `books` is an empty array — both seeded books removed, not just the first |

**Notes**
Seeding two books rather than one is deliberate: it is what distinguishes "removes the whole collection" from "removes one book", which is the neighbouring `DELETE /BookStore/v1/Book` endpoint's job.

The empty-body check in step 1 is the assertion that separates live behavior from the documented contract — Swagger claims a `BooksResult` payload for this status.

---

### TC: Delete all books from a collection that is already empty

| Field          | Value                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | DELETE-BOOKS-002                                                                                                                                                    |
| Condition      | COND-DELETE-BOOKS-005                                                                                                                                               |
| Risk           | Risk-1                                                                                                                                                              |
| Preconditions  | User account exists with an empty collection — no book has ever been added (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | UserId: the created user's `userId` / collection state: `[]` (zero books, never populated)                                                                          |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection still empty                                                                                           |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                                                                              |

**Steps & expected results**

| #   | Action                                                                                      | Expected result                                                                            |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send DELETE /BookStore/v1/Books?UserId=<userId> with header `Authorization: Bearer <token>` | Status 204 (not 400 and not a `1205`/`1207` error body); response body is completely empty |

**Notes**
The zero-item boundary of the collection. Deleting nothing is a success here, not a nothing-to-delete error — undocumented before the 2026-09-06 live check and reproduced on two users.

Seeds its own empty user, so it does not depend on DELETE-BOOKS-001 having run.

---

### TC: Repeat a successful delete-all request

| Field          | Value                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ID             | DELETE-BOOKS-003                                                                                                              |
| Condition      | COND-DELETE-BOOKS-006                                                                                                         |
| Risk           | Risk-1                                                                                                                        |
| Preconditions  | User account exists and token generated; the user's collection contains "9781449325862" (seeded via POST /BookStore/v1/Books) |
| Test data      | UserId: the created user's `userId` / seeded isbn: "9781449325862" / the same request sent twice with the same token          |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection empty                                                           |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                                        |

**Steps & expected results**

| #   | Action                                                                                          | Expected result                                                                                         |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books?UserId=<userId> with header `Authorization: Bearer <token>`     | Status 204; response body is completely empty                                                           |
| 2   | Send the identical DELETE /BookStore/v1/Books?UserId=<userId> request again with the same token | Status 204 again; response body is completely empty — **not** status 200 with `{ "code": "1207", ... }` |

**Notes**
The "not 200/1207" expectation in step 2 is the point of the case. The nearest precedent in this repo — AUTH-021, the repeat delete on `/Account/v1/User/{UUID}` — is **not** idempotent, so the reasonable prior was that this endpoint would match. It does not.

Distinct from DELETE-BOOKS-002 in precondition: 002 never had books, this case had books that step 1 removed. Both reach 204, but from different states.

---

### TC: Delete all books with the UserId query parameter absent

| Field          | Value                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | DELETE-BOOKS-004                                                                                                                     |
| Condition      | COND-DELETE-BOOKS-001                                                                                                                |
| Risk           | Risk-1                                                                                                                               |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken)                         |
| Test data      | URL: `/BookStore/v1/Books` with no `?UserId=` segment at all — the parameter is omitted, not sent empty / header: valid bearer token |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no collection changed                                                             |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                                               |

**Steps & expected results**

| #   | Action                                                                                           | Expected result                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books (no query parameter) with header `Authorization: Bearer <token>` | Status 401; body is `{ "code": "1207", "message": "User Id not correct!" }`; `code` is a string. Not status 500, and not an HTML stack-trace page |

**Notes**
The "not 500" half is the substantive part — the sibling `POST /BookStore/v1/Books` returns a 500 stack-trace page when a required key is absent (POST-BOOKS-004/005), so this case records that the prediction does not carry over.

The automated version needs a raw request: the typed client makes `userId` mandatory, the same precedent as POST-BOOKS-004/005.

---

### TC: Delete all books with an empty-string UserId

| Field          | Value                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| ID             | DELETE-BOOKS-005                                                                                             |
| Condition      | COND-DELETE-BOOKS-002                                                                                        |
| Risk           | Risk-1                                                                                                       |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | UserId: "" (empty string, 0 chars — the parameter is present in the query string but has no value)           |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no collection changed                                     |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                       |

**Steps & expected results**

| #   | Action                                                                              | Expected result                                                             |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books?UserId= with header `Authorization: Bearer <token>` | Status 401; body is `{ "code": "1207", "message": "User Id not correct!" }` |

**Notes**
The zero-length boundary of the required `UserId` parameter. Kept separate from DELETE-BOOKS-004 despite the identical response: absent and empty are distinct classes, and on the sibling POST endpoint they genuinely diverge — recording that they do **not** diverge here is the point.

---

### TC: Delete all books with a well-formed but unknown UserId

| Field          | Value                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| ID             | DELETE-BOOKS-006                                                                                             |
| Condition      | COND-DELETE-BOOKS-003                                                                                        |
| Risk           | Risk-1                                                                                                       |
| Preconditions  | User account exists (created via POST /Account/v1/User) and token generated (POST /Account/v1/GenerateToken) |
| Test data      | UserId: "11111111-2222-3333-4444-555555555555" (valid UUID format, belongs to no user)                       |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; no collection changed                                     |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                       |

**Steps & expected results**

| #   | Action                                                                                                                  | Expected result                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books?UserId=11111111-2222-3333-4444-555555555555 with header `Authorization: Bearer <token>` | Status 401; body is `{ "code": "1207", "message": "User Id not correct!" }` |

**Notes**
Response is identical to DELETE-BOOKS-004 and DELETE-BOOKS-005, but the input class is genuinely different (unknown vs. absent vs. empty), so all three are kept — the same precedent as POST-BOOKS-006/007.

---

### TC: Delete all books without an Authorization header

| Field          | Value                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ID             | DELETE-BOOKS-007                                                                                                              |
| Condition      | COND-DELETE-BOOKS-007                                                                                                         |
| Risk           | Risk-1, Risk-4                                                                                                                |
| Preconditions  | User account exists and token generated; the user's collection contains "9781449325862" (seeded via POST /BookStore/v1/Books) |
| Test data      | UserId: the created user's `userId` / seeded isbn: "9781449325862" / no `Authorization` header sent                           |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection still contains "9781449325862" until deletion                   |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                                        |

**Steps & expected results**

| #   | Action                                                                             | Expected result                                                                           |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books?UserId=<userId> with **no** `Authorization` header | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }`               |
| 2   | Send GET /Account/v1/User/{userId} with header `Authorization: Bearer <token>`     | Status 200; `books` still contains "9781449325862" — the rejected request deleted nothing |

**Notes**
Step 2 is what makes the case meaningful: a 401 that still emptied the collection would be the real defect. An authorization gap on a destructive endpoint means unauthenticated data loss, not merely an information leak.

---

### TC: Delete all books with a malformed bearer token

| Field          | Value                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ID             | DELETE-BOOKS-008                                                                                                              |
| Condition      | COND-DELETE-BOOKS-008                                                                                                         |
| Risk           | Risk-1, Risk-4                                                                                                                |
| Preconditions  | User account exists and token generated; the user's collection contains "9781449325862" (seeded via POST /BookStore/v1/Books) |
| Test data      | Header: `Authorization: Bearer not-a-real-token` / UserId: the created user's `userId`                                        |
| Postconditions | User deleted via DELETE /Account/v1/User/{userId}; collection still contains "9781449325862" until deletion                   |
| Automation     | Automated → `delete-books.api.spec.ts`                                                                                        |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books?UserId=<userId> with header `Authorization: Bearer not-a-real-token` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }` |

**Notes**
Response is identical to DELETE-BOOKS-007, but absent credentials and malformed credentials are distinct invalid classes, so both are kept.

---

### TC: Delete another user's books using own token

| Field          | Value                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | DELETE-BOOKS-009                                                                                                                                                                           |
| Condition      | COND-DELETE-BOOKS-009                                                                                                                                                                      |
| Risk           | Risk-1, Risk-4                                                                                                                                                                             |
| Preconditions  | Two independent user accounts exist, user A and user B, each with a generated token (POST /Account/v1/User + POST /Account/v1/GenerateToken); user B's collection contains "9781449325862" |
| Test data      | Header: user A's token / UserId: user B's `userId` / user B's seeded isbn: "9781449325862"                                                                                                 |
| Postconditions | Both users deleted via DELETE /Account/v1/User/{userId}; user B's collection unchanged until deletion                                                                                      |
| Automation     | Not automated                                                                                                                                                                              |

**Steps & expected results**

| #   | Action                                                                                                    | Expected result                                                                              |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Send DELETE /BookStore/v1/Books?UserId=<user B userId> with header `Authorization: Bearer <user A token>` | Status 401; body is `{ "code": "1200", "message": "User not authorized!" }`                  |
| 2   | Send GET /Account/v1/User/{user B userId} with header `Authorization: Bearer <user B token>`              | Status 200; `books` still contains "9781449325862" — nothing was deleted from B's collection |

**Notes**
The highest-value negative case in this file: step 2 is what distinguishes a genuine authorization boundary from a rejection that happened to leave a side effect behind — and on this endpoint that side effect would be data loss rather than a leak. Live-verified in both directions (A→B and B→A) on 2026-09-06.

Multi-actor: this case needs two independently seeded users. `generate-api-tests` does not support multi-actor test cases without a prior design decision on the fixture shape, the same limitation flagged on POST-BOOKS-013.

---

## Coverage summary

| Condition                 | Test case(s)     | Notes                                                      |
| ------------------------- | ---------------- | ---------------------------------------------------------- |
| COND-DELETE-BOOKS-001     | DELETE-BOOKS-004 |                                                            |
| COND-DELETE-BOOKS-002     | DELETE-BOOKS-005 |                                                            |
| COND-DELETE-BOOKS-003     | DELETE-BOOKS-006 |                                                            |
| COND-DELETE-BOOKS-004     | DELETE-BOOKS-001 |                                                            |
| COND-DELETE-BOOKS-005     | DELETE-BOOKS-002 |                                                            |
| COND-DELETE-BOOKS-006     | DELETE-BOOKS-003 |                                                            |
| COND-DELETE-BOOKS-007     | DELETE-BOOKS-007 |                                                            |
| COND-DELETE-BOOKS-008     | DELETE-BOOKS-008 |                                                            |
| COND-DELETE-BOOKS-009     | DELETE-BOOKS-009 |                                                            |
| COND-DELETE-BOOKS-INF-001 | —                | Infeasible: expired-token state unreachable in a suite run |
