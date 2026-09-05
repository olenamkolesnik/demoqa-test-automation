### TC: Get book list without authentication token

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| ID             | GET-BOOKS-001                                                       |
| Condition      | COND-GET-BOOKS-001                                                  |
| Risk           | —                                                                   |
| Preconditions  | None                                                                |
| Test data      | None — request has no query params, body, or `Authorization` header |
| Postconditions | None — read-only request, no state created                          |
| Automation     | Not automated                                                       |

**Steps & expected results**

| #   | Action                                                                          | Expected result                                                                                                                                   |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /BookStore/v1/Books with no `Authorization` header and no query params | Status 200; body is `{ books: [...] }`; `books` is a non-empty array; each item includes `isbn`, `title`, `author` (and other `BookModal` fields) |

**Notes**
None.
