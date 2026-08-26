# Test Cases — POST /Account/v1/User (Registration)

Generated from reviewed conditions in `docs/test-conditions/api/auth/post-user.md`. Every test case traces to exactly one condition; no test case exists without a condition behind it.

---

### TC: Register user with valid credentials and confirm live-confirmed response shape

| Field          | Value                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-001                                                                                                                                          |
| Condition      | COND-AUTH-001                                                                                                                                     |
| Risk           | Risk-1                                                                                                                                            |
| Preconditions  | None                                                                                                                                              |
| Test data      | userName: "qa_reg_valid_001" (unique) / password: "Aa1!aaaa" (8 chars — meets complexity: upper, lower, digit, special)                           |
| Postconditions | User "qa_reg_valid_001" deleted via DELETE /Account/v1/User/{userId} (requires a token acquired via POST /Account/v1/GenerateToken for this user) |
| Automation     | Not automated                                                                                                                                     |

**Steps & expected results**

| #   | Action                                                                                            | Expected result                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_valid_001", "password": "Aa1!aaaa" }` | Status 201; body contains `userID` (capital ID, non-empty string), `username` equal to "qa_reg_valid_001", and `books` equal to an empty array |

**Notes**
`userID` (capital ID) is the live-confirmed field name — the Swagger spec's `CreateUserResult` definition incorrectly documents this as `userId` (lowercase d). Assert the exact key name, not just presence of an ID field, to catch a regression toward trusting the Swagger spec. Username must be unique on the shared backend; use a random suffix in the automated version.

---

### TC: Register user with password missing an uppercase letter

| Field          | Value                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-002                                                                                                       |
| Condition      | COND-AUTH-002                                                                                                  |
| Risk           | Risk-1                                                                                                         |
| Preconditions  | None                                                                                                           |
| Test data      | userName: "qa_reg_no_upper_002" (unique) / password: "aa1!aaaa" (missing uppercase, all other rules satisfied) |
| Postconditions | None — registration is expected to fail, no user created                                                       |
| Automation     | Not automated                                                                                                  |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_upper_002", "password": "aa1!aaaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
None.

---

### TC: Register user with password missing a lowercase letter

| Field          | Value                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-003                                                                                                       |
| Condition      | COND-AUTH-003                                                                                                  |
| Risk           | Risk-1                                                                                                         |
| Preconditions  | None                                                                                                           |
| Test data      | userName: "qa_reg_no_lower_003" (unique) / password: "AA1!AAAA" (missing lowercase, all other rules satisfied) |
| Postconditions | None — registration is expected to fail, no user created                                                       |
| Automation     | Not automated                                                                                                  |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_lower_003", "password": "AA1!AAAA" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
None.

---

### TC: Register user with password missing a digit

| Field          | Value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-004                                                                                                   |
| Condition      | COND-AUTH-004                                                                                              |
| Risk           | Risk-1                                                                                                     |
| Preconditions  | None                                                                                                       |
| Test data      | userName: "qa_reg_no_digit_004" (unique) / password: "Aaaa!aaa" (missing digit, all other rules satisfied) |
| Postconditions | None — registration is expected to fail, no user created                                                   |
| Automation     | Not automated                                                                                              |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_digit_004", "password": "Aaaa!aaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
None.

---

### TC: Register user with password missing a special character

| Field          | Value                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| ID             | AUTH-005                                                                                                                 |
| Condition      | COND-AUTH-005                                                                                                            |
| Risk           | Risk-1                                                                                                                   |
| Preconditions  | None                                                                                                                     |
| Test data      | userName: "qa_reg_no_special_005" (unique) / password: "Aa1aaaaa" (missing special character, all other rules satisfied) |
| Postconditions | None — registration is expected to fail, no user created                                                                 |
| Automation     | Not automated                                                                                                            |

**Steps & expected results**

| #   | Action                                                                                                 | Expected result                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_special_005", "password": "Aa1aaaaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
None.

---

### TC: Register user with an empty password

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| ID             | AUTH-006                                                          |
| Condition      | COND-AUTH-006                                                     |
| Risk           | Risk-1                                                            |
| Preconditions  | None                                                              |
| Test data      | userName: "qa_reg_empty_pw_006" (unique) / password: "" (0 chars) |
| Postconditions | None — registration is expected to fail, no user created          |
| Automation     | Not automated                                                     |

**Steps & expected results**

| #   | Action                                                                                       | Expected result                                                                            |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_empty_pw_006", "password": "" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-confirmed 2026-08-26: an empty password does NOT return the weak-password (`code: "1300"`) response — it returns the same "required" response (`code: "1200"`) as a field that is entirely absent. Do not assert `1300` for this case.

---

### TC: Register user with a password one character below the minimum length

| Field          | Value                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-007                                                                                                                                                 |
| Condition      | COND-AUTH-007                                                                                                                                            |
| Risk           | Risk-1                                                                                                                                                   |
| Preconditions  | None                                                                                                                                                     |
| Test data      | userName: "qa_reg_short_pw_007" (unique) / password: "Aa1!aaa" (7 chars — one below the documented 8-char minimum, all other complexity rules satisfied) |
| Postconditions | None — registration is expected to fail, no user created                                                                                                 |
| Automation     | Not automated                                                                                                                                            |

**Steps & expected results**

| #   | Action                                                                                              | Expected result                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_short_pw_007", "password": "Aa1!aaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
Pairs with AUTH-001's 8-character valid password to bracket the length boundary.

---

### TC: Register user with userName field entirely absent from the request

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| ID             | AUTH-008                                                               |
| Condition      | COND-AUTH-008                                                          |
| Risk           | Risk-1                                                                 |
| Preconditions  | None                                                                   |
| Test data      | Request body: `{ "password": "Aa1!aaaa" }` — no `userName` key present |
| Postconditions | None — registration is expected to fail, no user created               |
| Automation     | Not automated                                                          |

**Steps & expected results**

| #   | Action                                                            | Expected result                                                                            |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "password": "Aa1!aaaa" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-confirmed 2026-08-26. Same response as AUTH-009 (missing password) and AUTH-010 (empty userName) — DemoQA uses one shared "required" error for either field being absent or empty, and does not distinguish which field triggered it.

---

### TC: Register user with password field entirely absent from the request

| Field          | Value                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| ID             | AUTH-009                                                                             |
| Condition      | COND-AUTH-009                                                                        |
| Risk           | Risk-1                                                                               |
| Preconditions  | None                                                                                 |
| Test data      | Request body: `{ "userName": "qa_reg_no_pw_field_009" }` — no `password` key present |
| Postconditions | None — registration is expected to fail, no user created                             |
| Automation     | Not automated                                                                        |

**Steps & expected results**

| #   | Action                                                                          | Expected result                                                                            |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_pw_field_009" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-confirmed 2026-08-26. Same response as AUTH-008 — see that test case's Notes for the shared-error detail.

---

### TC: Register user with an empty userName

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| ID             | AUTH-010                                                 |
| Condition      | COND-AUTH-010                                            |
| Risk           | Risk-1                                                   |
| Preconditions  | None                                                     |
| Test data      | userName: "" (0 chars) / password: "Aa1!aaaa" (valid)    |
| Postconditions | None — registration is expected to fail, no user created |
| Automation     | Not automated                                            |

**Steps & expected results**

| #   | Action                                                                            | Expected result                                                                            |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "userName": "", "password": "Aa1!aaaa" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-confirmed 2026-08-26. Same response as AUTH-006 (empty password) and AUTH-008/AUTH-009 (fields absent) — DemoQA treats an empty string identically to the field being entirely missing.

---

### TC: Register user with a username, then register again with the same username

| Field          | Value                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-011                                                                                                                                                              |
| Condition      | COND-AUTH-011                                                                                                                                                         |
| Risk           | Risk-1                                                                                                                                                                |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) with userName "qa_reg_dup_011" and password "Aa1!aaaa"                                                   |
| Test data      | userName: "qa_reg_dup_011" (already registered) / password: "Aa1!aaaa" (valid)                                                                                        |
| Postconditions | User "qa_reg_dup_011" (created during precondition setup) deleted via DELETE /Account/v1/User/{userId} (requires a token acquired via POST /Account/v1/GenerateToken) |
| Automation     | Not automated                                                                                                                                                         |

**Steps & expected results**

| #   | Action                                                                                                | Expected result                                                         |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User again with body `{ "userName": "qa_reg_dup_011", "password": "Aa1!aaaa" }` | Status 406; body equals `{ "code": "1204", "message": "User exists!" }` |

**Notes**
The precondition's registration call is expected to succeed (Status 201) — that call itself is exercised by AUTH-001 and is not re-verified here; this test case exercises only the second, duplicate attempt. `code` is confirmed to be a string ("1204"), not a number as the Swagger spec's `MessageModal` definition incorrectly documents.
