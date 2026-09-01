# DemoQA Book Store — Account API (Confirmed)

Source: raw Swagger spec extracted from `https://demoqa.com/swagger/swagger-ui-init.js` (saved as [`book-store-api.swagger.json`](./book-store-api.swagger.json)), cross-checked against live API calls on 2026-08-25, re-verified with no drift on 2026-09-01. Where the Swagger doc and live behavior disagreed, **live behavior wins** — the doc has several inaccuracies, noted below. See [`book-store-endpoints.md`](./book-store-endpoints.md) for the `/BookStore` endpoints verified the same way.

## POST /Account/v1/User (Create User)

Request: `{ userName: string, password: string }`

| Case               | Status | Body                                                                                                                                                                                                                                      |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success            | `201`  | `{ userID: string, username: string, books: [] }` — note **`userID`**, capital ID                                                                                                                                                         |
| Duplicate username | `406`  | `{ code: "1204", message: "User exists!" }`                                                                                                                                                                                               |
| Weak password      | `400`  | `{ code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Doc discrepancy:** Swagger only lists `404`/`406` as possible error responses — it's missing `400` entirely (the actual weak-password case). Response field `code` is documented as `number` but is actually a **string** (`"1300"`, `"1204"`).

**Password rule (confirmed from error message, not doc):** ≥8 characters, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 non-alphanumeric/special character.

## POST /Account/v1/GenerateToken

Request: `{ userName: string, password: string }`

| Case                  | Status | Body                                                                                                        |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Success               | `200`  | `{ token: string, expires: string (ISO date), status: "Success", result: "User authorized successfully." }` |
| Wrong password        | `200`  | `{ token: null, expires: null, status: "Failed", result: "User authorization failed." }`                    |
| Non-existent username | `200`  | Same as wrong password — indistinguishable from the response alone                                          |

**Confirmed quirk:** never returns a 4xx/5xx for bad credentials — always `200`, differentiate by `status` field only.

## POST /Account/v1/Authorized

Request: `{ userName: string, password: string }`

| Case           | Status | Body                                           |
| -------------- | ------ | ---------------------------------------------- |
| Success        | `200`  | `true` (bare boolean)                          |
| Wrong password | `404`  | `{ code: "1207", message: "User not found!" }` |

**Confirmed quirk:** wrong-password error message says "User not found!" — misleading (it's a password mismatch, not a missing user), but this is the real, live behavior. Non-existent username presumably produces the same response (not separately tested — same code path as "credentials don't match").

## GET /Account/v1/User/{UUID}

Auth: `Authorization: Bearer <token>` header required.

| Case                  | Status | Body                                                                               |
| --------------------- | ------ | ---------------------------------------------------------------------------------- |
| Success               | `200`  | `{ userId: string, username: string, books: [] }` — note **`userId`**, lowercase d |
| Missing/invalid token | `401`  | `{ code: "1200", message: "User not authorized!" }`                                |

**Important inconsistency:** this endpoint returns `userId` (lowercase `d`) while `POST /Account/v1/User` returns `userID` (capital `ID`) for the same conceptual field. Confirmed on both endpoints live — not a typo, a genuine API inconsistency. DTOs must model these as two distinct response shapes, not reuse one type.

## DELETE /Account/v1/User/{UUID}

Auth: `Authorization: Bearer <token>` header required.

| Case                  | Status | Body                                                |
| --------------------- | ------ | --------------------------------------------------- |
| Success               | `204`  | (empty)                                             |
| Missing/invalid token | `401`  | `{ code: "1200", message: "User not authorized!" }` |

**Doc discrepancy:** the Swagger doc's response table for this endpoint is essentially scrambled — it labels `200` as "Success" (schema `MessageModal`) and `204` as "Unauthorized" (schema `BooksResult`), which is backwards from confirmed live behavior (`204` empty body = success, `401` = unauthorized). Do not trust the doc's response descriptions for this endpoint.

## Auth mechanism (from spec `securityDefinitions`)

The API declares both `Basic` (HTTP Basic Auth) and `Bearer` (JWT via `Authorization` header) as valid security schemes for protected endpoints. Only `Bearer` was tested/confirmed above; `Basic` auth is documented but not exercised in this verification pass.
