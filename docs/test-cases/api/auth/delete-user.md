# Test Cases — DELETE /Account/v1/User/{UUID}

Generated from reviewed conditions in `docs/test-conditions/api/auth/delete-user.md`. Every test case traces to exactly one condition; no test case exists without a condition behind it.

---

### TC: Delete own user account with a valid token

| Field          | Value                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-017                                                                                                                                                                     |
| Condition      | COND-AUTH-017                                                                                                                                                                |
| Risk           | Risk-1                                                                                                                                                                       |
| Preconditions  | User account exists and token generated (POST /Account/v1/User, then POST /Account/v1/GenerateToken) for userName "qa_deluser_valid_017" and password "Aa1!aaaa"             |
| Test data      | UUID: the userId returned when the precondition user was created / Authorization header: Bearer \<token\> (the valid token acquired in the precondition, for this same user) |
| Postconditions | None — the test itself deletes the user, which is the behavior under test. No teardown call is needed or possible.                                                           |
| Automation     | Automated → `delete-user.api.spec.ts`                                                                                                                                        |

**Steps & expected results**

| #   | Action                                                                                  | Expected result                                                  |
| --- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Send DELETE /Account/v1/User/{userId} with header `Authorization: Bearer <valid token>` | Status 204; response body is empty — no JSON payload of any kind |

**Notes**
Assert the body is genuinely empty, not merely that the status is 204. Swagger documents a `BooksResult` schema for this status and labels `204` "Unauthorized" — both wrong. The empty-body assertion is what pins live behavior against the incorrect documented contract.

This is the only test case in this file with no teardown: deleting the user _is_ the test. Every other case here must clean up after itself.

---

### TC: Delete user account with no Authorization header

| Field          | Value                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-018                                                                                                                                                                                      |
| Condition      | COND-AUTH-018                                                                                                                                                                                 |
| Risk           | Risk-1, Risk-4                                                                                                                                                                                |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) with userName "qa_deluser_noauth_018" and password "Aa1!aaaa"                                                                    |
| Test data      | UUID: the userId returned when the precondition user was created / no Authorization header is sent                                                                                            |
| Postconditions | User "qa_deluser_noauth_018" deleted via DELETE /Account/v1/User/{userId} (requires a token acquired via POST /Account/v1/GenerateToken for this user, since none was generated during setup) |
| Automation     | Automated → `delete-user.api.spec.ts`                                                                                                                                                         |

**Steps & expected results**

| #   | Action                                                             | Expected result                                                                 |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 1   | Send DELETE /Account/v1/User/{userId} with no Authorization header | Status 401; body equals `{ "code": "1200", "message": "User not authorized!" }` |

**Notes**
The teardown matters more here than in the equivalent GET case: if the endpoint were to wrongly accept this unauthenticated request, the user would already be gone and the teardown would fail — that failure is itself a signal worth reading, not just noise.

Same response as AUTH-019 (invalid/malformed token) — DemoQA groups missing and invalid token under one documented, identical response.

---

### TC: Delete user account with an invalid or malformed token

| Field          | Value                                                                                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-019                                                                                                                                                                                        |
| Condition      | COND-AUTH-019                                                                                                                                                                                   |
| Risk           | Risk-1, Risk-4                                                                                                                                                                                  |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) with userName "qa_deluser_badtoken_019" and password "Aa1!aaaa"                                                                    |
| Test data      | UUID: the userId returned when the precondition user was created / Authorization header: `Bearer not-a-real-token-abc123`                                                                       |
| Postconditions | User "qa_deluser_badtoken_019" deleted via DELETE /Account/v1/User/{userId} (requires a token acquired via POST /Account/v1/GenerateToken for this user, since none was generated during setup) |
| Automation     | Automated → `delete-user.api.spec.ts`                                                                                                                                                           |

**Steps & expected results**

| #   | Action                                                                                            | Expected result                                                                 |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Send DELETE /Account/v1/User/{userId} with header `Authorization: Bearer not-a-real-token-abc123` | Status 401; body equals `{ "code": "1200", "message": "User not authorized!" }` |

**Notes**
Kept separate from AUTH-018 despite the identical expected response: absent header and present-but-invalid header are distinct invalid input classes, and a future API change could plausibly start distinguishing them.

---

### TC: Delete a non-existent user UUID with a valid unrelated token

| Field          | Value                                                                                                                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-020                                                                                                                                                                                                                                  |
| Condition      | COND-AUTH-020                                                                                                                                                                                                                             |
| Risk           | Risk-1, Risk-4                                                                                                                                                                                                                            |
| Preconditions  | User account exists and token generated (POST /Account/v1/User, then POST /Account/v1/GenerateToken) for userName "qa_deluser_nouuid_020" and password "Aa1!aaaa" — this user supplies the valid token but is **not** the deletion target |
| Test data      | UUID: "00000000-0000-0000-0000-000000000000" (well-formed but never issued) / Authorization header: Bearer \<token\> (the valid token belonging to "qa_deluser_nouuid_020")                                                               |
| Postconditions | User "qa_deluser_nouuid_020" deleted via DELETE /Account/v1/User/{userId} (reuse the token already acquired in the precondition) — the target UUID never existed, so nothing else needs cleanup                                           |
| Automation     | Automated → `delete-user.api.spec.ts`                                                                                                                                                                                                     |

**Steps & expected results**

| #   | Action                                                                                                              | Expected result                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Send DELETE /Account/v1/User/00000000-0000-0000-0000-000000000000 with header `Authorization: Bearer <valid token>` | Status 200; body equals `{ "code": "1207", "message": "User Id not correct!" }` |

**Notes**
Live-verified 2026-09-03. The `200` is the substantive assertion — an error body under a success status. A client branching on `res.ok` would read this failed deletion as a success, so asserting the status explicitly is the point of the case.

Do not assert this against `GET /Account/v1/User/{UUID}`'s behavior for the same scenario: GET returns `1207` as `401` with message "User not found!". Same code, different status, different message text.

The precondition user is deliberately unrelated to the target UUID — this case tests an unknown UUID, not an authorization mismatch, so the token must be valid.

---

### TC: Delete an already-deleted user account

| Field          | Value                                                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | AUTH-021                                                                                                                                                                          |
| Condition      | COND-AUTH-021                                                                                                                                                                     |
| Risk           | Risk-1, Risk-4                                                                                                                                                                    |
| Preconditions  | User account exists and token generated (POST /Account/v1/User, then POST /Account/v1/GenerateToken) for userName "qa_deluser_repeat_021" and password "Aa1!aaaa"                 |
| Test data      | UUID: the userId returned when the precondition user was created / Authorization header: Bearer \<token\> (the same token for both requests — it is not regenerated between them) |
| Postconditions | None — the user is deleted by step 1 of the test itself                                                                                                                           |
| Automation     | Automated → `delete-user.api.spec.ts`                                                                                                                                             |

**Steps & expected results**

| #   | Action                                                                                                    | Expected result                                                                 |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Send DELETE /Account/v1/User/{userId} with header `Authorization: Bearer <valid token>`                   | Status 204; response body is empty                                              |
| 2   | Send the identical request again — same URL, same `Authorization: Bearer <token>` header, not regenerated | Status 200; body equals `{ "code": "1207", "message": "User Id not correct!" }` |

**Notes**
Live-verified 2026-09-03 across three independent runs with three separate users — deterministic, not a one-off.

This is the only two-step case in the file, and the second step is the actual assertion: step 1 establishes the deleted state. It confirms the endpoint is **not** idempotent in the REST sense — a second DELETE returns `200`/`1207`, not a repeated `204`.

The stale token is deliberately reused rather than regenerated. That is what rules out the `1200` authorization branch: the token still authenticates fine after its user is gone, and the failure is reported against the UUID instead. Regenerating a token here would test something else entirely (and would fail, since the user no longer exists).

Response is byte-identical to AUTH-020's — the API does not distinguish "never issued" from "issued then deleted".
