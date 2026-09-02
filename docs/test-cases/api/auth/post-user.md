# Test Cases — POST /Account/v1/User (Registration)

Generated from reviewed conditions in `docs/test-conditions/api/auth/post-user.md`. Every test case traces to exactly one condition; no test case exists without a condition behind it.

**On Risk-1 across every case here:** the negative cases (AUTH-002 to AUTH-010) are expected to fail and create nothing, but they still carry `Risk-1`. The request reaches the shared public backend either way, and each one sends a username that could collide with another run's data — so Risk-1's mitigation (unique per-test data, random suffixes) applies to them exactly as it does to the two cases that persist an account. Only AUTH-001 and AUTH-011 need teardown; the rest need isolation, which is the same risk.

---

### TC: Register user with valid credentials

| Field          | Value                                                                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-001                                                                                                                                                                                              |
| Condition      | COND-AUTH-001                                                                                                                                                                                         |
| Risk           | Risk-1                                                                                                                                                                                                |
| Preconditions  | None                                                                                                                                                                                                  |
| Test data      | userName: "qa_reg_valid_001" (unique) / password: "Aa1!aaaa" (8 chars — meets complexity: upper, lower, digit, special)                                                                               |
| Postconditions | User "qa_reg_valid_001" deleted via DELETE /Account/v1/User/{UUID}, using the `userID` returned by the registration call (requires a token acquired via POST /Account/v1/GenerateToken for this user) |
| Automation     | Automated → `post-user.api.spec.ts`                                                                                                                                                                   |

**Steps & expected results**

| #   | Action                                                                                            | Expected result                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_valid_001", "password": "Aa1!aaaa" }` | Status 201; body contains `userID` (capital ID, non-empty string), `username` equal to "qa_reg_valid_001", and `books` equal to an empty array; the key `userId` (lowercase d) is absent |

**Notes**
`userID` (capital ID) is the live-confirmed field name — the Swagger spec's `CreateUserResult` definition incorrectly documents it as `userId` (lowercase d). Assert the exact key name and the absence of the lowercase variant, not just the presence of some ID field, to catch a regression toward trusting the Swagger spec.

The same conceptual field is genuinely `userId` (lowercase) on `GET /Account/v1/User/{UUID}` — see AUTH-012. That inconsistency is real API behavior, not a documentation error, so the two endpoints need distinct response types.

The 8-character password doubles as the minimum-valid BVA boundary, pairing with AUTH-007's 7-character case to bracket the length minimum.

Username must be unique on the shared backend; use a random suffix in the automated version.

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
| Automation     | Automated → `post-user.api.spec.ts`                                                                            |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_upper_002", "password": "aa1!aaaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
The password violates exactly one complexity rule so the case exercises that specific invalid class rather than a compound failure. The API returns one shared complexity message for all four violations and does not name which rule failed, so AUTH-002 through AUTH-005 assert an identical body and differ only in input.

`code` is a string ("1300"), not the number the Swagger `MessageModal` definition declares.

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
| Automation     | Automated → `post-user.api.spec.ts`                                                                            |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_lower_003", "password": "AA1!AAAA" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
See AUTH-002 on the shared complexity message.

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
| Automation     | Automated → `post-user.api.spec.ts`                                                                        |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_digit_004", "password": "Aaaa!aaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
See AUTH-002 on the shared complexity message.

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
| Automation     | Automated → `post-user.api.spec.ts`                                                                                      |

**Steps & expected results**

| #   | Action                                                                                                 | Expected result                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_special_005", "password": "Aa1aaaaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
See AUTH-002 on the shared complexity message.

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
| Automation     | Automated → `post-user.api.spec.ts`                               |

**Steps & expected results**

| #   | Action                                                                                       | Expected result                                                                            |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_empty_pw_006", "password": "" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-verified 2026-09-02. An empty password returns the **required-field** response (`code: "1200"`), **not** the weak-password complexity error (`code: "1300"`) — even though 0 characters does violate the 8-character minimum. DemoQA treats an empty string as an absent field and never reaches the complexity check. Asserting `1300` here would fail.

Contrast AUTH-007, where a present 7-character password does return `1300`. The two sit at opposite ends of the same length boundary but take different code paths, so neither case's expected body can be inferred from the other.

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
| Automation     | Automated → `post-user.api.spec.ts`                                                                                                                      |

**Steps & expected results**

| #   | Action                                                                                              | Expected result                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_short_pw_007", "password": "Aa1!aaa" }` | Status 400; body equals `{ "code": "1300", "message": "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer." }` |

**Notes**
Pairs with AUTH-001's 8-character valid password to bracket the length boundary. Length is the only rule this password violates — it satisfies all four character-class rules — so the case isolates the boundary itself.

Live-verified 2026-09-02 as the control that established the distinction described in AUTH-006's Notes: a present short password reaches the complexity check, an empty one does not.

---

### TC: Register user with the userName field entirely absent from the request

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| ID             | AUTH-008                                                               |
| Condition      | COND-AUTH-008                                                          |
| Risk           | Risk-1                                                                 |
| Preconditions  | None                                                                   |
| Test data      | Request body: `{ "password": "Aa1!aaaa" }` — no `userName` key present |
| Postconditions | None — registration is expected to fail, no user created               |
| Automation     | Automated → `post-user.api.spec.ts`                                    |

**Steps & expected results**

| #   | Action                                                            | Expected result                                                                            |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "password": "Aa1!aaaa" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-verified 2026-09-02. The key is genuinely absent, not present-and-empty — that distinction is what separates this case from AUTH-010.

Same status and body as AUTH-009 (missing password), AUTH-010 (empty userName), and AUTH-006 (empty password): DemoQA uses one shared required-field code path for either field, whether absent or empty, and does not indicate which field triggered it. The four cases are kept separate because they cover different fields and different violation forms — a future fix that distinguishes them would need all four to notice.

---

### TC: Register user with the password field entirely absent from the request

| Field          | Value                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| ID             | AUTH-009                                                                             |
| Condition      | COND-AUTH-009                                                                        |
| Risk           | Risk-1                                                                               |
| Preconditions  | None                                                                                 |
| Test data      | Request body: `{ "userName": "qa_reg_no_pw_field_009" }` — no `password` key present |
| Postconditions | None — registration is expected to fail, no user created                             |
| Automation     | Automated → `post-user.api.spec.ts`                                                  |

**Steps & expected results**

| #   | Action                                                                          | Expected result                                                                            |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_reg_no_pw_field_009" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-verified 2026-09-02. Same response as AUTH-008 — see that test case's Notes for the shared-code-path detail.

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
| Automation     | Automated → `post-user.api.spec.ts`                      |

**Steps & expected results**

| #   | Action                                                                            | Expected result                                                                            |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Send POST /Account/v1/User with body `{ "userName": "", "password": "Aa1!aaaa" }` | Status 400; body equals `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Live-verified 2026-09-02: DemoQA does **not** distinguish an empty string from an absent key. This returns the same response as AUTH-008, where the `userName` key is missing entirely.

That equivalence is an observed property of the current implementation, not a documented guarantee — which is why this case and AUTH-008 both exist rather than being merged. Only separate cases would catch the behavior diverging.

---

### TC: Register a username, then register again with the same username

| Field          | Value                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-011                                                                                                                                                                                                            |
| Condition      | COND-AUTH-011                                                                                                                                                                                                       |
| Risk           | Risk-1                                                                                                                                                                                                              |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) with userName "qa_reg_dup_011" and password "Aa1!aaaa"                                                                                                 |
| Test data      | userName: "qa_reg_dup_011" (already registered) / password: "Aa1!aaaa" (valid)                                                                                                                                      |
| Postconditions | User "qa_reg_dup_011" (created during precondition setup) deleted via DELETE /Account/v1/User/{UUID}, using the `userID` returned by that setup call (requires a token acquired via POST /Account/v1/GenerateToken) |
| Automation     | Automated → `post-user.api.spec.ts`                                                                                                                                                                                 |

**Steps & expected results**

| #   | Action                                                                                                | Expected result                                                         |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User again with body `{ "userName": "qa_reg_dup_011", "password": "Aa1!aaaa" }` | Status 406; body equals `{ "code": "1204", "message": "User exists!" }` |

**Notes**
The precondition's registration call is expected to succeed (Status 201) — that call is exercised by AUTH-001 and is not re-verified here. This case exercises only the second, duplicate attempt.

The rejection depends on backend state rather than on the input itself: the identical body succeeds when the username is new. The precondition setup is internal to this test case and creates no ordering dependency on any other case.

`code` is confirmed as the string "1204", not the number the Swagger `MessageModal` definition declares.
