# Test Cases — POST /Account/v1/Authorized

Derived from [`docs/test-conditions/api/auth/post-authorized.md`](../../../test-conditions/api/auth/post-authorized.md).

Endpoint behavior reference: [`docs/api-spec/account-endpoints.md`](../../../api-spec/account-endpoints.md).

**On what this endpoint actually reports:** despite its name, `POST /Account/v1/Authorized` answers "does this user currently hold a token?", not "are these credentials valid?" (live-verified 2026-09-04). Correct credentials return `200` with the bare boolean `false` until the user has called `POST /Account/v1/GenerateToken` at least once, and `true` afterwards. Every case below is written against that behavior, not against the Swagger contract.

**On the bare-boolean body:** the `200` response is a JSON scalar — the literal token `true` or `false` — not an object. There is no `status`, `code`, `message` or `result` field. Because `false` is a legitimate `200`, a truthiness check (`expect(body).toBeTruthy()`, `if (body)`) accepts only half the contract; expected results below assert identity against the boolean value, with the status asserted separately since `200` alone does not discriminate. The `400` and `404` paths return ordinary `MessageModal` objects, so the body's _type_ varies with the outcome.

---

### TC: Check authorization for a user who has generated a token

| Field          | Value                                                                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-029                                                                                                                                                                                              |
| Condition      | COND-AUTH-029                                                                                                                                                                                         |
| Risk           | Risk-1                                                                                                                                                                                                |
| Preconditions  | User account exists **and** a token has been generated for that same user (POST /Account/v1/User, then POST /Account/v1/GenerateToken) for userName "qa_auth029_1725440000" with password "Test@1234" |
| Test data      | userName: "qa_auth029_1725440000" / password: "Test@1234" (8+ chars, upper, lower, digit, special) — the user's own correct credentials                                                               |
| Postconditions | User "qa_auth029_1725440000" deleted via DELETE /Account/v1/User/{userID}, using the token acquired in the precondition                                                                               |
| Automation     | Automated → `post-authorized.api.spec.ts`                                                                                                                                                             |

**Steps & expected results**

| #   | Action                                                                                                           | Expected result                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_auth029_1725440000", "password": "Test@1234" }`          | Status 201; body contains `userID` (non-empty string) and `username` equal to "qa_auth029_1725440000"                           |
| 2   | Send POST /Account/v1/GenerateToken with body `{ "userName": "qa_auth029_1725440000", "password": "Test@1234" }` | Status 200; body has `token` as a non-empty string and `status` equal to "Success"                                              |
| 3   | Send POST /Account/v1/Authorized with body `{ "userName": "qa_auth029_1725440000", "password": "Test@1234" }`    | Status 200; the entire response body is the bare JSON boolean `true` — strictly `true`, not the string "true" and not an object |

**Notes**
Steps 1 and 2 are the precondition made explicit, and step 2 is not optional decoration: seeding via `POST /Account/v1/User` alone is **insufficient**. A test that skips token generation observes `false` and fails, having tested nothing wrong — this is the single most likely way to get this case wrong.

Assert identity against `true`, never truthiness — the `false` counterpart (AUTH-030) shares the same `200` status, so a truthiness check or a "body is non-empty" check silently accepts half the contract. Assert the status separately; it carries no information on its own.

The token is generated moments before the check, so the case never depends on a token surviving any interval. Whether the flag reflects a live token or a never-resetting "has ever generated" marker is unresolved — see COND-AUTH-INF-011.

---

### TC: Check authorization for a user who has never generated a token

| Field          | Value                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-030                                                                                                                                                                                                                                    |
| Condition      | COND-AUTH-030                                                                                                                                                                                                                               |
| Risk           | Risk-1                                                                                                                                                                                                                                      |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) for userName "qa_auth030_1725440000" with password "Test@1234"; POST /Account/v1/GenerateToken has **never** been called for this user                                         |
| Test data      | userName: "qa_auth030_1725440000" / password: "Test@1234" — the user's own correct credentials                                                                                                                                              |
| Postconditions | User "qa_auth030_1725440000" deleted via DELETE /Account/v1/User/{userID} (requires a token acquired via POST /Account/v1/GenerateToken for this user, since none was generated during setup — generate it only after step 2 has completed) |
| Automation     | Automated → `post-authorized.api.spec.ts`                                                                                                                                                                                                   |

**Steps & expected results**

| #   | Action                                                                                                        | Expected result                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/User with body `{ "userName": "qa_auth030_1725440000", "password": "Test@1234" }`       | Status 201; body contains `userID` (non-empty string) and `username` equal to "qa_auth030_1725440000"                   |
| 2   | Send POST /Account/v1/Authorized with body `{ "userName": "qa_auth030_1725440000", "password": "Test@1234" }` | Status 200; the entire response body is the bare JSON boolean `false` — **not** 404 and **not** a `MessageModal` object |

**Notes**
The credentials submitted are correct, so this is a valid-credentials case, not a negative one. `false` here is the endpoint reporting session state, not rejecting the login.

This case must use a user no other case has tokenized, and the teardown token must not be generated until after step 2 — generating one earlier would flip the state under test and turn the expected `false` into `true`.

The contrast with AUTH-031 is the substance: both submit a real, registered username, and the two answers are structurally different — `200` with a scalar here, `404` with an object there. Asserting the status distinguishes them; asserting the body alone does not, since a loosely-typed client can read a `404` body as falsy too. Assert both.

---

### TC: Check authorization with an incorrect password

| Field          | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | AUTH-031                                                                                                                                               |
| Condition      | COND-AUTH-031                                                                                                                                          |
| Risk           | Risk-1, Risk-4                                                                                                                                         |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) for userName "qa_auth031_1725440000" with password "Test@1234"                            |
| Test data      | userName: "qa_auth031_1725440000" / password submitted: "Wrong@9999" (not the registered password, which is "Test@1234")                               |
| Postconditions | User "qa_auth031_1725440000" deleted via DELETE /Account/v1/User/{userID} (requires a token acquired via POST /Account/v1/GenerateToken for this user) |
| Automation     | Automated → `post-authorized.api.spec.ts`                                                                                                              |

**Steps & expected results**

| #   | Action                                                                                                         | Expected result                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/Authorized with body `{ "userName": "qa_auth031_1725440000", "password": "Wrong@9999" }` | Status 404; body equal to `{ "code": "1207", "message": "User not found!" }` — **not** status 200 with the bare boolean `false` |

**Notes**
The message text "User not found!" is factually wrong for this case — the user exists, the password does not match — but it is the real, live behavior and the expected value asserts it verbatim. Do not "correct" it.

Confirmed 2026-09-04 that this holds regardless of the user's token state: a wrong password returns 404/1207 both for a user who has generated a token and for one who has not, so token state does not shadow the credential check.

`code` is a string ("1207"), not a number, despite Swagger typing it as numeric.

`1207` is this API's general "no such user" code, but neither its wrapping status nor its message text is shared across endpoints — `GET /Account/v1/User/{UUID}` pairs 1207/"User not found!" with 401, and `DELETE` pairs 1207/"User Id not correct!" with 200. Assert this endpoint's own pairing; do not reuse another's.

Risk-4 observed behavior: the 404/1207 response was confirmed live on 2026-09-04. A deviation is a sandbox quirk to record here, not a framework bug.

---

### TC: Check authorization with a username that was never registered

| Field          | Value                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| ID             | AUTH-032                                                                     |
| Condition      | COND-AUTH-032                                                                |
| Risk           | Risk-1, Risk-4                                                               |
| Preconditions  | No account exists for the submitted username — the value is never registered |
| Test data      | userName: "qa_never_registered_1725440000" / password: "Test@1234"           |
| Postconditions | None — no account is created, so nothing to clean up                         |
| Automation     | Automated → `post-authorized.api.spec.ts`                                    |

**Steps & expected results**

| #   | Action                                                                                                                 | Expected result                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/Authorized with body `{ "userName": "qa_never_registered_1725440000", "password": "Test@1234" }` | Status 404; body equal to `{ "code": "1207", "message": "User not found!" }` |

**Notes**
The response is byte-identical to AUTH-031 (wrong password), live-verified 2026-09-04 across two never-registered usernames and two runs each. That indistinguishability is itself the property under test — it prevents username enumeration, and the misleading "User not found!" text is precisely what makes it work. Should a future change make the two responses differ, this test is what catches it.

The username must be one that genuinely does not exist; the timestamp suffix keeps it unique against the shared backend.

Kept separate from AUTH-031 despite the identical response: "user exists, password wrong" and "user does not exist" are distinct invalid input classes.

---

### TC: Check authorization with an empty password

| Field          | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | AUTH-033                                                                                                                                               |
| Condition      | COND-AUTH-033                                                                                                                                          |
| Risk           | Risk-1, Risk-4                                                                                                                                         |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) for userName "qa_auth033_1725440000" with password "Test@1234"                            |
| Test data      | userName: "qa_auth033_1725440000" (registered) / password: "" (empty string, 0 chars)                                                                  |
| Postconditions | User "qa_auth033_1725440000" deleted via DELETE /Account/v1/User/{userID} (requires a token acquired via POST /Account/v1/GenerateToken for this user) |
| Automation     | Automated → `post-authorized.api.spec.ts`                                                                                                              |

**Steps & expected results**

| #   | Action                                                                                               | Expected result                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/Authorized with body `{ "userName": "qa_auth033_1725440000", "password": "" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` — **not** 404/1207 |

**Notes**
The distinction under test is which of two paths an empty password takes. The competing outcome — 404/1207, "an empty password matches nobody" — would have kept this endpoint's error vocabulary self-consistent, and could not be ruled out by inference from `POST /Account/v1/GenerateToken`, whose vocabulary differs. Live check 2026-09-04 settles it: the required-field check short-circuits before any credential lookup, so the answer is 400/1200 even though the username is a real registered one.

The practical consequence: this endpoint returns errors in two different vocabularies depending on the failure kind, and status code alone tells you which. A client mapping this endpoint's errors must handle 400/1200 as well as 404/1207.

`code` is a string ("1200"), not a number.

Risk-4 observed behavior: 400/1200 confirmed deterministic across two runs on 2026-09-04. Rejection precedes the credential lookup, so this path does not exercise the sandbox's credential handling.

---

### TC: Check authorization with an empty username

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| ID             | AUTH-034                                                        |
| Condition      | COND-AUTH-034                                                   |
| Risk           | Risk-4                                                          |
| Preconditions  | None — the request is rejected before any account lookup occurs |
| Test data      | userName: "" (empty string, 0 chars) / password: "Test@1234"    |
| Postconditions | None — no account is created                                    |
| Automation     | Automated → `post-authorized.api.spec.ts`                       |

**Steps & expected results**

| #   | Action                                                                                   | Expected result                                                                                                 |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/Authorized with body `{ "userName": "", "password": "Test@1234" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` — **not** 404/1207 |

**Notes**
The competing outcome is more tempting here than in AUTH-033 — an empty username is, after all, a username nobody has, and 404/"User not found!" would have been a perfectly coherent answer for this endpoint. Live check 2026-09-04 confirms the required-field check runs first: 400/1200, across two runs.

Risk-4 observed behavior: rejection precedes authentication, so this path does not exercise the sandbox's credential handling.

---

### TC: Check authorization with the username key absent from the body

| Field          | Value                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| ID             | AUTH-035                                                                                             |
| Condition      | COND-AUTH-035                                                                                        |
| Risk           | Risk-4                                                                                               |
| Preconditions  | None — the request is rejected before any account lookup occurs                                      |
| Test data      | Request body carries only the password key: `{ "password": "Test@1234" }` — no `userName` key at all |
| Postconditions | None — no account is created                                                                         |
| Automation     | Automated → `post-authorized.api.spec.ts`                                                            |

**Steps & expected results**

| #   | Action                                                                   | Expected result                                                                              |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/Authorized with body `{ "password": "Test@1234" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Distinct from AUTH-034 (empty string) at the HTTP level even though live check 2026-09-04 confirms both land on the same 1200 code path — absent key and present-but-empty are separate invalid input classes.

Automating this needs a raw request rather than a typed client call: the client signature models the real API contract, so it cannot express a genuinely absent key.

Risk-4 observed behavior: 400/1200 confirmed deterministic across two runs on 2026-09-04.

---

### TC: Check authorization with the password key absent from the body

| Field          | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ID             | AUTH-036                                                                                                                                               |
| Condition      | COND-AUTH-036                                                                                                                                          |
| Risk           | Risk-1, Risk-4                                                                                                                                         |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) for userName "qa_auth036_1725440000" with password "Test@1234"                            |
| Test data      | Request body carries only the username key: `{ "userName": "qa_auth036_1725440000" }` — no `password` key at all                                       |
| Postconditions | User "qa_auth036_1725440000" deleted via DELETE /Account/v1/User/{userID} (requires a token acquired via POST /Account/v1/GenerateToken for this user) |
| Automation     | Automated → `post-authorized.api.spec.ts`                                                                                                              |

**Steps & expected results**

| #   | Action                                                                               | Expected result                                                                              |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1   | Send POST /Account/v1/Authorized with body `{ "userName": "qa_auth036_1725440000" }` | Status 400; body equal to `{ "code": "1200", "message": "UserName and Password required." }` |

**Notes**
Separate from AUTH-033 (empty password) for the same reason AUTH-035 is separate from AUTH-034: absent key and empty value are distinct classes. The username sent is a real registered one, which is what shows the required-field check short-circuits before the credential lookup.

Live check 2026-09-04 additionally confirmed that a wholly empty body `{}` — both keys absent — returns the same 400/1200. No separate test case: it is the intersection of AUTH-035 and AUTH-036 rather than a further class, and it produces no distinct outcome. Automated as its own `test()` block sharing this ID (no separate manual test case exists for it), rather than as an extra assertion inside AUTH-036's own test — keeping "password key absent" and "both keys absent" independently diagnosable on failure.

Needs a raw request, same as AUTH-035.

---

## Traceability

| Condition         | Test case | Covered                                                 |
| ----------------- | --------- | ------------------------------------------------------- |
| COND-AUTH-029     | AUTH-029  | Token holder → 200, bare boolean `true`                 |
| COND-AUTH-030     | AUTH-030  | Never generated a token → 200, bare boolean `false`     |
| COND-AUTH-031     | AUTH-031  | Wrong password → 404/1207                               |
| COND-AUTH-032     | AUTH-032  | Non-existent username → 404/1207, byte-identical        |
| COND-AUTH-033     | AUTH-033  | Empty password → 400/1200                               |
| COND-AUTH-034     | AUTH-034  | Empty username → 400/1200                               |
| COND-AUTH-035     | AUTH-035  | Absent userName key → 400/1200                          |
| COND-AUTH-036     | AUTH-036  | Absent password key → 400/1200 (also covers empty `{}`) |
| COND-AUTH-INF-011 | —         | Infeasible: expired-token state needs clock control     |
| COND-AUTH-INF-012 | —         | Infeasible: per-token vs. per-user flag, out of scope   |
