# Test Cases — POST /Account/v1/GenerateToken

Derived from [`docs/test-conditions/api/auth/post-generate-token.md`](../../../test-conditions/api/auth/post-generate-token.md).

Endpoint behavior reference: [`docs/api-spec/account-endpoints.md`](../../../api-spec/account-endpoints.md).

---

### TC: Generate token with valid credentials

| Field          | Value                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| ID             | AUTH-022                                                                                           |
| Condition      | COND-AUTH-022                                                                                      |
| Risk           | Risk-1                                                                                             |
| Preconditions  | User account exists (created via API: POST /Account/v1/User)                                       |
| Test data      | userName: "qa_auth022_1725440000" / password: "Test@1234" (8+ chars, upper, lower, digit, special) |
| Postconditions | User "qa_auth022_1725440000" deleted via DELETE /Account/v1/User/{userID}                          |
| Automation     | Not automated                                                                                      |

**Steps & expected results**

| #   | Action                                                                                                           | Expected result                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/GenerateToken with body `{ "userName": "qa_auth022_1725440000", "password": "Test@1234" }` | Status 200; body has `token` as a non-empty string, `expires` as a non-null parseable ISO-8601 date string, `status` equal to "Success", `result` equal to "User authorized successfully." |

**Notes**
Asserting `token` is non-null is the substantive check — the failure response (AUTH-023) also returns 200 and differs only in the body, so a status-only assertion would pass against a rejected login.

`expires` is verified as a parseable ISO-8601 string only. Its lifetime is undocumented and cannot be waited out — see COND-AUTH-INF-009.

---

### TC: Generate token with incorrect password

| Field          | Value                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ID             | AUTH-023                                                                                                                 |
| Condition      | COND-AUTH-023                                                                                                            |
| Risk           | Risk-1, Risk-4                                                                                                           |
| Preconditions  | User account exists (created via API: POST /Account/v1/User)                                                             |
| Test data      | userName: "qa_auth023_1725440000" / password submitted: "Wrong@9999" (not the registered password, which is "Test@1234") |
| Postconditions | User "qa_auth023_1725440000" deleted via DELETE /Account/v1/User/{userID}                                                |
| Automation     | Not automated                                                                                                            |

**Steps & expected results**

| #   | Action                                                                                                            | Expected result                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/GenerateToken with body `{ "userName": "qa_auth023_1725440000", "password": "Wrong@9999" }` | Status 200; body has `token` equal to `null`, `expires` equal to `null`, `status` equal to "Failed", `result` equal to "User authorization failed." |

**Notes**
The status 200 is the point of the test, not an incidental detail: a client branching on `res.ok` would treat this rejected login as a success and carry a `null` token forward.

`token` and `expires` must be asserted as explicitly `null`, not merely absent — the live-confirmed body carries both keys with null values.

---

### TC: Generate token with a username that was never registered

| Field          | Value                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| ID             | AUTH-024                                                                     |
| Condition      | COND-AUTH-024                                                                |
| Risk           | Risk-1, Risk-4                                                               |
| Preconditions  | No account exists for the submitted username — the value is never registered |
| Test data      | userName: "qa_never_registered_1725440000" / password: "Test@1234"           |
| Postconditions | None — no account is created, so nothing to clean up                         |
| Automation     | Not automated                                                                |

**Steps & expected results**

| #   | Action                                                                                                                    | Expected result                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/GenerateToken with body `{ "userName": "qa_never_registered_1725440000", "password": "Test@1234" }` | Status 200; body has `token` equal to `null`, `expires` equal to `null`, `status` equal to "Failed", `result` equal to "User authorization failed." |

**Notes**
The response is byte-identical to AUTH-023 (wrong password). That indistinguishability is itself the property under test — it prevents username enumeration. Should a future change make the two responses differ, this test is what catches it.

The username must be one that genuinely does not exist; the timestamp suffix keeps it unique against the shared backend.

Risk-4 observed behavior: the 200/"Failed" response was confirmed live on 2026-09-04, deterministic across repeated runs. No rate limiting or inconsistency was seen at this call volume. A deviation from the documented body is a sandbox quirk to record here, not a framework bug.

---

### TC: Generate token with an empty password

| Field          | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| ID             | AUTH-025                                                                  |
| Condition      | COND-AUTH-025                                                             |
| Risk           | Risk-1, Risk-4                                                            |
| Preconditions  | User account exists (created via API: POST /Account/v1/User)              |
| Test data      | userName: "qa_auth025_1725440000" / password: "" (empty string, 0 chars)  |
| Postconditions | User "qa_auth025_1725440000" deleted via DELETE /Account/v1/User/{userID} |
| Automation     | Not automated                                                             |

**Steps & expected results**

| #   | Action                                                                                                  | Expected result                                                                              |
| --- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/GenerateToken with body `{ "userName": "qa_auth025_1725440000", "password": "" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
The distinction under test is which of two paths an empty password takes. The required-field check short-circuits before any credential comparison, so this returns 400/1200 — **not** the 200/"Failed" authentication response of AUTH-023. Verified live on this endpoint 2026-09-04.

`code` is a string ("1200"), not a number, despite Swagger typing it as numeric.

Risk-4 observed behavior: the 400/1200 response was confirmed live on 2026-09-04, deterministic across two runs, with a valid-credentials control returning 200/Success in the same pass. Rejection happens before authentication, so this path does not depend on the sandbox's credential handling.

---

### TC: Generate token with an empty username

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| ID             | AUTH-026                                                        |
| Condition      | COND-AUTH-026                                                   |
| Risk           | Risk-4                                                          |
| Preconditions  | None — the request is rejected before any account lookup occurs |
| Test data      | userName: "" (empty string, 0 chars) / password: "Test@1234"    |
| Postconditions | None — no account is created                                    |
| Automation     | Not automated                                                   |

**Steps & expected results**

| #   | Action                                                                                      | Expected result                                                                              |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/GenerateToken with body `{ "userName": "", "password": "Test@1234" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
The competing outcome is the 200/"Failed" unknown-user response of AUTH-024 — an empty username is, after all, a username nobody has. The required-field check runs first, confirmed live 2026-09-04.

Risk-4 observed behavior: 400/1200 confirmed deterministic across two runs on 2026-09-04. Rejection precedes authentication, so this path does not exercise the sandbox's credential handling.

---

### TC: Generate token with the username key absent from the body

| Field          | Value                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| ID             | AUTH-027                                                                                             |
| Condition      | COND-AUTH-027                                                                                        |
| Risk           | Risk-4                                                                                               |
| Preconditions  | None — the request is rejected before any account lookup occurs                                      |
| Test data      | Request body carries only the password key: `{ "password": "Test@1234" }` — no `userName` key at all |
| Postconditions | None — no account is created                                                                         |
| Automation     | Not automated                                                                                        |

**Steps & expected results**

| #   | Action                                                                      | Expected result                                                                              |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/GenerateToken with body `{ "password": "Test@1234" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Distinct from AUTH-026 (empty string) at the HTTP level even though both land on the same 1200 code path — absent key and present-but-empty are separate invalid input classes.

Automating this needs a raw request rather than a typed client call: the client signature models the real API contract, so it cannot express a genuinely absent key.

Risk-4 observed behavior: 400/1200 confirmed deterministic across two runs on 2026-09-04. Rejection precedes authentication, so this path does not exercise the sandbox's credential handling.

---

### TC: Generate token with the password key absent from the body

| Field          | Value                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-028                                                                                                         |
| Condition      | COND-AUTH-028                                                                                                    |
| Risk           | Risk-1, Risk-4                                                                                                   |
| Preconditions  | User account exists (created via API: POST /Account/v1/User)                                                     |
| Test data      | Request body carries only the username key: `{ "userName": "qa_auth028_1725440000" }` — no `password` key at all |
| Postconditions | User "qa_auth028_1725440000" deleted via DELETE /Account/v1/User/{userID}                                        |
| Automation     | Not automated                                                                                                    |

**Steps & expected results**

| #   | Action                                                                                  | Expected result                                                                              |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/GenerateToken with body `{ "userName": "qa_auth028_1725440000" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Separate from AUTH-025 (empty password) for the same reason AUTH-027 is separate from AUTH-026: absent key and empty value are distinct classes.

Needs a raw request, same as AUTH-027.

Risk-4 observed behavior: 400/1200 confirmed deterministic across two runs on 2026-09-04. Rejection precedes authentication, so this path does not exercise the sandbox's credential handling.

---

## Traceability

| Condition         | Test case | Covered                                      |
| ----------------- | --------- | -------------------------------------------- |
| COND-AUTH-022     | AUTH-022  | Valid credentials → token, Success           |
| COND-AUTH-023     | AUTH-023  | Wrong password → 200/Failed                  |
| COND-AUTH-024     | AUTH-024  | Non-existent username → 200/Failed           |
| COND-AUTH-025     | AUTH-025  | Empty password → 400/1200                    |
| COND-AUTH-026     | AUTH-026  | Empty username → 400/1200                    |
| COND-AUTH-027     | AUTH-027  | Absent userName key → 400/1200               |
| COND-AUTH-028     | AUTH-028  | Absent password key → 400/1200               |
| COND-AUTH-INF-009 | —         | Infeasible: token expiry needs clock control |
| COND-AUTH-INF-010 | —         | Infeasible: repeat generation, out of scope  |
