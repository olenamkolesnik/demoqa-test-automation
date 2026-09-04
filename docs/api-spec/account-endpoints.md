# DemoQA Book Store — Account API (Confirmed)

Source: raw Swagger spec extracted from `https://demoqa.com/swagger/swagger-ui-init.js` (saved as [`book-store-api.swagger.json`](./book-store-api.swagger.json)), cross-checked against live API calls on 2026-08-25, re-verified with no drift on 2026-09-01. Extended 2026-09-02 with the required-field behavior of `POST /Account/v1/User`, which no earlier pass had covered; the previously documented cases were re-confirmed unchanged in that pass. Extended 2026-09-03 with the unknown-UUID behavior of `DELETE /Account/v1/User/{UUID}` (non-existent and already-deleted), also uncovered by earlier passes; the DELETE success and auth-failure rows were re-confirmed unchanged. Extended 2026-09-04 with the required-field behavior of `POST /Account/v1/GenerateToken`, which no earlier pass had covered — previously assumed to match `POST /Account/v1/User` and now confirmed to; the GenerateToken success and failure rows were re-confirmed unchanged in that pass. Where the Swagger doc and live behavior disagreed, **live behavior wins** — the doc has several inaccuracies, noted below. See [`book-store-endpoints.md`](./book-store-endpoints.md) for the `/BookStore` endpoints verified the same way.

## POST /Account/v1/User (Create User)

Request: `{ userName: string, password: string }`

| Case                            | Status | Body                                                                                                                                                                                                                                      |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success                         | `201`  | `{ userID: string, username: string, books: [] }` — note **`userID`**, capital ID                                                                                                                                                         |
| Duplicate username              | `406`  | `{ code: "1204", message: "User exists!" }`                                                                                                                                                                                               |
| Weak password                   | `400`  | `{ code: "1300", message: "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |
| Missing or empty required field | `400`  | `{ code: "1200", message: "UserName and Password required." }` — verified 2026-09-02                                                                                                                                                      |

**Doc discrepancy:** Swagger only lists `404`/`406` as possible error responses — it's missing `400` entirely (the actual weak-password case). Response field `code` is documented as `number` but is actually a **string** (`"1300"`, `"1204"`, `"1200"`).

**Password rule (confirmed from error message, not doc):** ≥8 characters, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 non-alphanumeric/special character.

**Required-field handling (verified 2026-09-02, undocumented in Swagger):** one shared `1200` code path covers every required-field violation — `userName` or `password`, whether the key is absent from the body or present with an empty string. All four combinations return the identical status and body; the API does not indicate which field was at fault, nor distinguish an absent key from an empty value.

An empty password is the case worth knowing: it returns `1200`, **not** the `1300` weak-password error, even though 0 characters violates the 8-character minimum. An empty string is treated as an absent field and never reaches the complexity check. Confirmed against a control in the same pass — a present 7-character password does return `1300` — so the two paths are genuinely distinct. Do not assume a short-or-empty password takes the complexity path.

Swagger's operation definition marks the request body parameter `"required": false`, contradicting `RegisterViewModel`'s own `required: [userName, password]`. Live behavior confirms the fields are genuinely required; the `required` array is correct and the parameter flag is not.

## POST /Account/v1/GenerateToken

Request: `{ userName: string, password: string }`

| Case                            | Status | Body                                                                                                        |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Success                         | `200`  | `{ token: string, expires: string (ISO date), status: "Success", result: "User authorized successfully." }` |
| Wrong password                  | `200`  | `{ token: null, expires: null, status: "Failed", result: "User authorization failed." }`                    |
| Non-existent username           | `200`  | Same as wrong password — indistinguishable from the response alone                                          |
| Missing or empty required field | `400`  | `{ code: "1200", message: "UserName and Password required." }` — verified 2026-09-04                        |

**Confirmed quirk:** never returns a 4xx/5xx for **bad credentials** — always `200`, differentiate by `status` field only. This does not extend to malformed requests: a missing or empty required field is rejected with a real `400` before authentication is attempted (see below).

**Required-field handling (verified 2026-09-04, undocumented in Swagger):** identical to `POST /Account/v1/User` — one shared `1200` code path covers every required-field violation on `userName` or `password`, whether the key is absent from the body or present with an empty string. All four combinations return the identical `400` status and body, deterministic across two runs each, with a valid-credentials control returning `200`/Success in the same pass.

The empty-password case is the one worth knowing: `{ userName: "<real user>", password: "" }` returns `400`/`1200`, **not** the `200`/`"Failed"` authentication response. The required-field check short-circuits before any credential comparison, so an empty password never reaches the authentication path. Likewise `{ userName: "", password: "<valid>" }` returns `400`/`1200` rather than being treated as an unknown user. Do not assume an empty credential takes the `status: "Failed"` path.

**Token shape (observed 2026-09-04, incidental):** the issued `token` is an unsigned-decodable JWT whose payload contains the submitted `userName` and **the plaintext password**, plus an `iat` claim. `expires` was observed ~7 days ahead of issuance; no lifetime is documented, and token expiry is not testable within a suite run.

**`expires` format (raw examples, 2026-09-04):** UTC, `Z`-suffixed, millisecond precision — e.g. `"2026-09-11T10:30:04.885Z"`, `"2026-09-11T10:30:06.941Z"`. Confirmed across two independent calls in the same pass.

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

| Case                                     | Status | Body                                                                      |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Success                                  | `204`  | (empty)                                                                   |
| Missing/invalid token                    | `401`  | `{ code: "1200", message: "User not authorized!" }`                       |
| Non-existent UUID, valid unrelated token | `200`  | `{ code: "1207", message: "User Id not correct!" }` — verified 2026-09-03 |
| Already-deleted UUID, stale token        | `200`  | `{ code: "1207", message: "User Id not correct!" }` — verified 2026-09-03 |

**Doc discrepancy:** the Swagger doc's response table for this endpoint is essentially scrambled — it labels `200` as "Success" (schema `MessageModal`) and `204` as "Unauthorized" (schema `BooksResult`), which is backwards from confirmed live behavior (`204` empty body = success, `401` = unauthorized). Do not trust the doc's response descriptions for this endpoint.

**Unknown-user handling (verified 2026-09-03, undocumented in Swagger):** one shared `1207` code path covers both "this UUID was never issued" and "this UUID was deleted already" — the two are indistinguishable from the response alone. Confirmed deterministic across three independent runs with three separate users.

Two things about this response are worth not glossing over:

`200` carries an error body. Unlike the `401` auth failures above, an unknown UUID returns HTTP `200` with a `MessageModal`-shaped error payload, so status code alone cannot be used to detect this case — the same trap as `POST /Account/v1/GenerateToken`, which also always returns `200` and differentiates by body. A client that branches on `res.ok` treats a failed delete as a success.

The `1207` message text is endpoint-specific. `GET /Account/v1/User/{UUID}` returns `1207` with `"User not found!"` under HTTP `401`; DELETE returns `1207` with `"User Id not correct!"` under HTTP `200`. Same code, different message, different status. So `1207` identifies "no such user" as a concept, but neither its wrapper status nor its message text is shared across endpoints — do not assert one endpoint's pairing against another.

Repeat deletion is therefore **not** idempotent in the REST sense: the second call returns `200`/`1207` rather than `204`.

## Auth mechanism (from spec `securityDefinitions`)

The API declares both `Basic` (HTTP Basic Auth) and `Bearer` (JWT via `Authorization` header) as valid security schemes for protected endpoints. Only `Bearer` was tested/confirmed above; `Basic` auth is documented but not exercised in this verification pass.
