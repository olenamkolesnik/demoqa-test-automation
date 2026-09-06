# DemoQA Book Store — BookStore API (Confirmed)

Source: raw Swagger spec extracted from `https://demoqa.com/swagger/swagger-ui-init.js` (saved as [`book-store-api.swagger.json`](./book-store-api.swagger.json)), cross-checked against live API calls on 2026-09-01, extended for `POST /BookStore/v1/Books` by a live check on 2026-09-05 and for `DELETE /BookStore/v1/Books` by a live check on 2026-09-06. Where the Swagger doc and live behavior disagreed, **live behavior wins** — the doc has several inaccuracies, noted below. See [`account-endpoints.md`](./account-endpoints.md) for the `/Account` endpoints.

## GET /BookStore/v1/Books (all books)

| Case    | Status | Body                     |
| ------- | ------ | ------------------------ |
| Success | `200`  | `{ books: BookModal[] }` |

Matches the doc — no auth required, no error cases (the collection is never empty).

## GET /BookStore/v1/Book (single book)

Query param: `ISBN`

| Case         | Status | Body                                                                               |
| ------------ | ------ | ---------------------------------------------------------------------------------- |
| Success      | `200`  | `BookModal` (bare object)                                                          |
| Unknown ISBN | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }` |

Matches the doc.

## POST /BookStore/v1/Books (add books to a user's collection)

Auth: `Authorization: Bearer <token>` header required.

Request: `{ userId: string, collectionOfIsbns: [{ isbn: string }] }`

| Case                                     | Status | Body                                                                                                      |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Success (one or many ISBNs)              | `201`  | `{ books: [{ isbn: string }] }` — echoes the submitted ISBNs, one entry per item sent                     |
| Missing/invalid token                    | `401`  | `{ code: "1200", message: "User not authorized!" }`                                                       |
| Token belonging to a different user      | `401`  | `{ code: "1200", message: "User not authorized!" }` — **live-verified 2026-09-05**                        |
| Unknown ISBN (only ISBN in the batch)    | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }`                        |
| ISBN already in collection               | `400`  | `{ code: "1210", message: "ISBN already present in the User's Collection!" }`                             |
| `collectionOfIsbns` present but empty    | `400`  | `{ code: "1207", message: "Collection of books required." }` — **live-verified 2026-09-05**               |
| `userId` present but empty string        | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-05**; note `401`, not `400` |
| `userId` well-formed but unknown         | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-05**                        |
| `userId` key absent from body            | `500`  | HTML error page with a Sequelize stack trace — **live-verified 2026-09-05**                               |
| `collectionOfIsbns` key absent from body | `500`  | HTML error page with a `TypeError` stack trace — **live-verified 2026-09-05**                             |

**Live findings, 2026-09-05** (each reproduced on two independent `qa_`-prefixed users):

- **Absent keys crash the server.** Omitting `userId` returns `500` with an HTML page leaking a Sequelize query-generator stack trace; omitting `collectionOfIsbns` returns `500` leaking a `TypeError` from `api/routes/books.js:43`. Both are unhandled server errors, not validated `400`s — and they differ from a present-but-empty value, which _is_ handled. This is the one place on this resource where absent and empty are not equivalent.
- **A partial batch silently lies.** A `collectionOfIsbns` containing one valid and one unknown ISBN returns `201` and echoes **both** ISBNs back, but only the valid one is actually persisted (confirmed by reading the collection back via `GET /Account/v1/User/{UUID}`). An unknown ISBN is rejected with `400`/`1205` only when it is the sole item in the batch. The `201` body is therefore not a trustworthy record of what was stored.
- **`1207` is overloaded.** On this endpoint alone it carries two different messages under two different statuses (`400`/"Collection of books required." and `401`/"User Id not correct!"), and `/Account` endpoints reuse it with different text again. Never assert a `1207` code without also asserting its status and message.

**Doc discrepancy:** Swagger declares the `201` success schema as `type: array` + `CollectionOfIsbn` (i.e. a bare array of `{isbn}`). Live response is actually an **object** `{ books: [...] }`, same shape as `AllBooksModal`/`CollectionOfIsbn` combined — not a bare array. Model the response as `{ books: { isbn: string }[] }`.

## PUT /BookStore/v1/Books/{ISBN} (replace a book in a user's collection)

Auth: `Authorization: Bearer <token>` header required.

Path param: `ISBN` (the book being replaced). Request body: `{ userId: string, isbn: string }` (the new ISBN).

| Case                  | Status | Body                                                                              |
| --------------------- | ------ | --------------------------------------------------------------------------------- |
| Success               | `200`  | `{ userId: string, username: string, books: BookModal[] }` (full `GetUserResult`) |
| Missing/invalid token | `401`  | `{ code: "1200", message: "User not authorized!" }`                               |

Matches the doc — response schema (`GetUserResult`, lowercase `userId`) and status codes both confirmed live.

## DELETE /BookStore/v1/Book (remove one book from a user's collection)

Auth: `Authorization: Bearer <token>` header required.

Request: `{ userId: string, isbn: string }`

| Case                  | Status | Body                                                |
| --------------------- | ------ | --------------------------------------------------- |
| Success               | `204`  | (empty)                                             |
| Missing/invalid token | `401`  | `{ code: "1200", message: "User not authorized!" }` |

**Doc discrepancy:** same pattern as `DELETE /Account/v1/User` — Swagger labels the `204` response schema as `UserBooksResult`, but live behavior returns an **empty body** on `204`. Do not expect a response payload on success.

## DELETE /BookStore/v1/Books (remove all books from a user's collection)

Auth: `Authorization: Bearer <token>` header required.

Query param: `UserId`

| Case                                     | Status | Body                                                                               |
| ---------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Success (collection had books)           | `204`  | (empty)                                                                            |
| Success (collection already empty)       | `204`  | (empty) — **live-verified 2026-09-06**; idempotent, not an error                   |
| Repeat delete of an already-emptied user | `204`  | (empty) — **live-verified 2026-09-06**                                             |
| Missing/invalid token                    | `401`  | `{ code: "1200", message: "User not authorized!" }`                                |
| Token belonging to a different user      | `401`  | `{ code: "1200", message: "User not authorized!" }` — **live-verified 2026-09-06** |
| `UserId` query param absent entirely     | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-06** |
| `UserId` present but empty               | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-06** |
| `UserId` well-formed but unknown         | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-06** |

**Live findings, 2026-09-06** (each reproduced on two independent `qa_`-prefixed users):

- **This endpoint is idempotent.** Deleting an already-empty collection, and repeating a delete that already succeeded, both return `204` — not an error. This is the opposite of `DELETE /Account/v1/User/{UUID}`, which returns `200`/`1207` on a repeat. Do not carry the `/Account` precedent over to this endpoint.
- **An absent `UserId` does not crash.** Unlike `POST /BookStore/v1/Books`, where omitting a required key returns `500` with a stack trace, omitting `UserId` here is handled: `401`/`1207`, byte-identical to an empty or unknown value. Absent, empty, and unknown all collapse into one response on this endpoint.
- **Cross-user deletes are refused** in both directions (token A + `UserId` B, and the reverse): `401`/`1200`, with the target's collection left intact.
- **`1207` is overloaded here too** — `401`/"User Id not correct!", matching `POST /BookStore/v1/Books`'s `userId` cases but differing from the `400`/"Collection of books required." variant on that same endpoint. Never assert a `1207` code without also asserting its status and message.

**Doc discrepancy:** same pattern — Swagger labels `204` as schema `BooksResult`, but live behavior returns an **empty body** on success. Do not expect a response payload on success.

## Auth mechanism

Same as `/Account` endpoints — `Authorization: Bearer <token>` header required for all mutating operations (`POST`, `PUT`, `DELETE`). `GET` endpoints are unauthenticated.
