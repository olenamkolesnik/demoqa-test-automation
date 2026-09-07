# DemoQA Book Store — BookStore API (Confirmed)

Source: raw Swagger spec extracted from `https://demoqa.com/swagger/swagger-ui-init.js` (saved as [`book-store-api.swagger.json`](./book-store-api.swagger.json)), cross-checked against live API calls on 2026-09-01, extended for `POST /BookStore/v1/Books` by a live check on 2026-09-05, for `DELETE /BookStore/v1/Books` and `GET /BookStore/v1/Book` by live checks on 2026-09-06, and for `PUT /BookStore/v1/Books/{ISBN}` by a live check on 2026-09-06. Where the Swagger doc and live behavior disagreed, **live behavior wins** — the doc has several inaccuracies, noted below. See [`account-endpoints.md`](./account-endpoints.md) for the `/Account` endpoints.

## GET /BookStore/v1/Books (all books)

| Case    | Status | Body                     |
| ------- | ------ | ------------------------ |
| Success | `200`  | `{ books: BookModal[] }` |

Matches the doc — no auth required, no error cases (the collection is never empty).

## GET /BookStore/v1/Book (single book)

Query param: `ISBN` — **case-sensitive** (see live findings below).

| Case                                     | Status | Body                                                                                                              |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Success                                  | `200`  | `BookModal` (bare object)                                                                                         |
| Unknown ISBN                             | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }`                                |
| `ISBN` present but empty                 | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }` — **live-verified 2026-09-06** |
| `ISBN` non-numeric / malformed           | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }` — **live-verified 2026-09-06** |
| `ISBN` query param absent entirely       | `500`  | HTML error page with a Sequelize stack trace — **live-verified 2026-09-06**                                       |
| Param spelled `isbn` (wrong casing)      | `500`  | HTML error page, identical to absent — **live-verified 2026-09-06**                                               |
| Any `Authorization` header (valid/bogus) | `200`  | Ignored entirely; unauthenticated endpoint — **live-verified 2026-09-06**                                         |

**Live findings, 2026-09-06** (each reproduced across three independent runs):

- **An absent `ISBN` crashes the server.** Omitting the query parameter returns `500` with an HTML page leaking a Sequelize stack trace (`WHERE parameter "isbn" has invalid "undefined" value`). This matches `POST /BookStore/v1/Books`'s absent-key behavior and is the **opposite** of `DELETE /BookStore/v1/Books`, where an absent `UserId` is validated into a `401`/`1207`. Absent and empty are not equivalent here: an empty `ISBN` _is_ handled, returning `400`/`1205`.
- **The query parameter is case-sensitive.** `?isbn=...` (lowercase) is treated exactly as if the parameter were absent — same `500`, same stack trace. Only `ISBN` is read.
- **Every invalid-but-present `ISBN` collapses to one response.** Empty, whitespace, non-numeric, and well-formed-but-unknown all return `400`/`1205` with identical text. The endpoint validates catalogue membership, not ISBN format.
- **Auth is ignored, not rejected.** A bogus bearer token returns `200` with the book, confirming the documented "GET endpoints are unauthenticated" claim — the header is not merely optional, it has no effect at all.

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

Path param: `ISBN` (the book being replaced — must already be in the caller's collection). Request body: `{ userId: string, isbn: string }` (the new ISBN).

| Case                                         | Status | Body                                                                                                                    |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Success                                      | `200`  | `{ userId: string, username: string, books: BookModal[] }` (full `GetUserResult`)                                       |
| Path `ISBN` not in the user's collection     | `400`  | `{ code: "1206", message: "ISBN supplied is not available in User's Collection!" }` — **live-verified 2026-09-06**      |
| Path `ISBN` unknown to the catalogue         | `400`  | `{ code: "1206", ... }` — same as above; membership is checked before catalogue validity — **live-verified 2026-09-06** |
| Path `ISBN` equals the body `isbn`           | `400`  | `{ code: "1206", ... }` — **live-verified 2026-09-06**; see findings, this is a defect                                  |
| Body `isbn` unknown to the catalogue         | `400`  | `{ code: "1205", message: "ISBN supplied is not available in Books Collection!" }` — **live-verified 2026-09-06**       |
| Body `isbn` already in the user's collection | `200`  | Succeeds and **silently drops a book** — **live-verified 2026-09-06**; see findings                                     |
| `userId` well-formed but unknown             | `401`  | `{ code: "1207", message: "User Id not correct!" }` — **live-verified 2026-09-06**                                      |
| `userId` empty string                        | `400`  | `{ code: "1207", message: "Request Body is Invalid!" }` — **live-verified 2026-09-06**                                  |
| `userId` or `isbn` key absent from body      | `400`  | `{ code: "1207", message: "Request Body is Invalid!" }` — **live-verified 2026-09-06**; no `500`                        |
| Empty JSON object body `{}`                  | `400`  | `{ code: "1207", message: "Request Body is Invalid!" }` — **live-verified 2026-09-06**                                  |
| Missing/invalid token                        | `401`  | `{ code: "1200", message: "User not authorized!" }`                                                                     |
| Token belonging to a different user          | `401`  | `{ code: "1200", message: "User not authorized!" }` — **live-verified 2026-09-06**; target's collection intact          |

**Live findings, 2026-09-06** (each reproduced on two independent `qa_`-prefixed users):

- **Replacing a book with one the user already owns silently destroys a book.** A user holding `[A, B]` who replaces `A` with `B` gets `200` and a collection of `[B]` — the entry count drops from two to one with no error and no warning. The `200` body accurately reports the reduced collection, so the response is not lying; the operation itself is. This is the most serious defect on this resource: ordinary user actions lose data.
- **Replacing a book with itself is rejected as "not in your collection".** `PUT /Books/{A}` with body `isbn: A`, for a user who demonstrably owns `A`, returns `400`/`1206` "ISBN supplied is not available in User's Collection!" — a message that contradicts the actual state. The no-op case is not merely unsupported, it reports a false reason.
- **This endpoint validates its body; `POST` does not.** An absent `userId` or `isbn` key returns a handled `400`/`1207`, where `POST /BookStore/v1/Books` returns `500` with a Sequelize stack trace for the same omission. Three endpoints on this resource now handle an absent required field three different ways: `POST` crashes (`500`), `DELETE /Books` validates to `401`/`1207`, and `PUT` validates to `400`/`1207`. Do not generalise one endpoint's handling to another.
- **`1207` is overloaded a third way.** This endpoint returns `400`/"Request Body is Invalid!" for a malformed body **and** `401`/"User Id not correct!" for a well-formed-but-unknown `userId` — while `POST` uses `400`/"Collection of books required." and `DELETE /Books` uses `401`/"User Id not correct!". Never assert a `1207` code without also asserting its status and message.
- **`1206` is new to this resource.** No other `/BookStore` endpoint returns it. It means "not in _your_ collection", distinct from `1205`'s "not in the _catalogue_" — and the path `ISBN` is checked for collection membership before catalogue validity, so an ISBN that is neither returns `1206`, not `1205`.
- **Ordinary replacement preserves the rest of the collection.** A user holding `[A, C]` replacing `A` with `B` correctly ends at `[B, C]`. The data loss above is specific to a target the user already owns, not to multi-book collections generally.
- **Cross-user replacement is refused.** Token A naming user B's `userId` returns `401`/`1200`, with B's collection left intact.
- **The `200` body's book order is not the read-back order.** The `PUT` response listed `[C, B]` where `GET /Account/v1/User/{UUID}` returned `[B, C]` — same set, different sequence. Assert collection membership, never positional order.
- **The `200` body can echo a duplicate entry that was never persisted.** When the replacement target is already owned (the duplicate-target defect above), the response body itself lists the surviving book **twice** — `[C, C]` for a two-item response where the actual post-state, confirmed by `GET /Account/v1/User/{UUID}`, is a single entry `[C]`. The response is not merely reordered here, it is factually wrong about the collection's size. Never assert `books.length` or membership against the `PUT` response body alone for this case — read back via `GET /Account/v1/User/{UUID}` to get the real state, the same precedent already established for `POST /BookStore/v1/Books`'s partial-batch echo (COND-POST-BOOKS-009).

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

**Deleting the owning Account user also removes the collection (live-verified 2026-09-07, three independent `qa_`-prefixed users).** After `DELETE /Account/v1/User/{UUID}` returns `204`, a follow-up `GET /Account/v1/User/{UUID}` returns `401`/`1207` "User not found!" — the user and their books are gone together, so a collection cannot outlive its owner. This is why the book-seeding fixtures in `src/fixtures/book-store.fixtures.ts` tear down the user only: an explicit `DELETE /BookStore/v1/Books` before deleting the user would be a redundant round-trip, not extra safety. Re-verify this if user-deletion behavior ever changes, since the fixtures' cleanup correctness depends on it.

## Auth mechanism

Same as `/Account` endpoints — `Authorization: Bearer <token>` header required for all mutating operations (`POST`, `PUT`, `DELETE`). `GET` endpoints are unauthenticated.
