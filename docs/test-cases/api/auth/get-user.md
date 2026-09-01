# Test Cases — GET /Account/v1/User/{UUID}

Generated from reviewed conditions in `docs/test-conditions/api/auth/get-user.md`. Every test case traces to exactly one condition; no test case exists without a condition behind it.

---

### TC: Get own user profile with a valid token

| Field          | Value                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-012                                                                                                                                                                     |
| Condition      | COND-AUTH-012                                                                                                                                                                |
| Risk           | Risk-1                                                                                                                                                                       |
| Preconditions  | User account exists and token generated (POST /Account/v1/User, then POST /Account/v1/GenerateToken) for userName "qa_getuser_valid_012" and password "Aa1!aaaa"             |
| Test data      | UUID: the userId returned when the precondition user was created / Authorization header: Bearer \<token\> (the valid token acquired in the precondition, for this same user) |
| Postconditions | User "qa_getuser_valid_012" deleted via DELETE /Account/v1/User/{userId} (reuse the token already acquired in the precondition)                                              |
| Automation     | Automated → `get-user.api.spec.ts`                                                                                                                                           |

**Steps & expected results**

| #   | Action                                                                               | Expected result                                                                                                     |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Send GET /Account/v1/User/{userId} with header `Authorization: Bearer <valid token>` | Status 200; body equals `{ "userId": "<same as requested UUID>", "username": "qa_getuser_valid_012", "books": [] }` |

**Notes**
`userId` (lowercase d) is the live-confirmed field name for this endpoint — the opposite casing from `POST /Account/v1/User`'s response, which uses capital `ID`. Assert the exact key name, not just presence of an ID field, to catch a regression toward assuming the two endpoints share one casing convention.

---

### TC: Get user profile with no Authorization header

| Field          | Value                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-013                                                                                                                                                                                      |
| Condition      | COND-AUTH-013                                                                                                                                                                                 |
| Risk           | Risk-1, Risk-4                                                                                                                                                                                |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) with userName "qa_getuser_noauth_013" and password "Aa1!aaaa"                                                                    |
| Test data      | UUID: the userId returned when the precondition user was created / no Authorization header is sent                                                                                            |
| Postconditions | User "qa_getuser_noauth_013" deleted via DELETE /Account/v1/User/{userId} (requires a token acquired via POST /Account/v1/GenerateToken for this user, since none was generated during setup) |
| Automation     | Automated → `get-user.api.spec.ts`                                                                                                                                                            |

**Steps & expected results**

| #   | Action                                                          | Expected result                                                                 |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Send GET /Account/v1/User/{userId} with no Authorization header | Status 401; body equals `{ "code": "1200", "message": "User not authorized!" }` |

**Notes**
Live-confirmed. Same response as AUTH-014 (invalid/malformed token) — DemoQA groups missing and invalid token under one documented, identical response.

---

### TC: Get user profile with an invalid or malformed token

| Field          | Value                                                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-014                                                                                                                                                                                                                                      |
| Condition      | COND-AUTH-014                                                                                                                                                                                                                                 |
| Risk           | Risk-1, Risk-4                                                                                                                                                                                                                                |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) with userName "qa_getuser_badtoken_014" and password "Aa1!aaaa"                                                                                                                  |
| Test data      | UUID: the userId returned when the precondition user was created / Authorization header: Bearer not-a-real-token-abc123 (malformed/never-issued token)                                                                                        |
| Postconditions | User "qa_getuser_badtoken_014" deleted via DELETE /Account/v1/User/{userId} (requires a token acquired via POST /Account/v1/GenerateToken for this user, since the token used in the test itself is invalid and cannot be reused for cleanup) |
| Automation     | Automated → `get-user.api.spec.ts`                                                                                                                                                                                                            |

**Steps & expected results**

| #   | Action                                                                                         | Expected result                                                                 |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Send GET /Account/v1/User/{userId} with header `Authorization: Bearer not-a-real-token-abc123` | Status 401; body equals `{ "code": "1200", "message": "User not authorized!" }` |

**Notes**
Live-confirmed. Same response as AUTH-013 (missing header) — see that test case's Notes for the shared-response detail. `code` is asserted as a string ("1200"); swagger's `MessageModal` documents `code` as a number, which is unconfirmed for this specific endpoint but known to be wrong on every other endpoint sharing this schema — treat swagger's `number` type as unreliable here too.

---

### TC: Get a non-existent user's profile using a valid, unrelated token

| Field          | Value                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-016                                                                                                                                                                         |
| Condition      | COND-AUTH-016                                                                                                                                                                    |
| Risk           | Risk-1, Risk-4                                                                                                                                                                   |
| Preconditions  | One user account exists and has a token generated (POST /Account/v1/User, then POST /Account/v1/GenerateToken) for userName "qa_getuser_nonexistent_016" and password "Aa1!aaaa" |
| Test data      | UUID: a well-formed but never-issued UUID (e.g. "00000000-0000-0000-0000-000000000000") / Authorization header: Bearer \<the precondition user's valid token\>                   |
| Postconditions | The precondition user deleted via DELETE /Account/v1/User/{userId}, using the already-acquired token                                                                             |
| Automation     | Not automated                                                                                                                                                                    |

**Steps & expected results**

| #   | Action                                                                                                                      | Expected result                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Send GET /Account/v1/User/00000000-0000-0000-0000-000000000000 with header `Authorization: Bearer <valid, unrelated token>` | Status 401; body equals `{ "code": "1207", "message": "User not found!" }` |

**Notes**
Live-confirmed 2026-08-26. This response is distinct from AUTH-013/AUTH-014's shared `1200`/"User not authorized!" response, despite sharing the same HTTP status (401) — assert the exact `code` value, not just the status code, to distinguish this scenario from the others. The `1207`/"User not found!" pair matches the code already confirmed for `POST /Account/v1/Authorized`'s wrong-password case, suggesting `1207` is a general "no such user" code reused across endpoints.
