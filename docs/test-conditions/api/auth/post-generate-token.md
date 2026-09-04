# Test Conditions — POST /Account/v1/GenerateToken

## Endpoint analysis

**Endpoint:** POST /Account/v1/GenerateToken
**Source:** OpenAPI spec (`docs/api-spec/book-store-api.swagger.json`) cross-checked against observed live behavior (`docs/api-spec/account-endpoints.md`). Live behavior wins wherever the two disagree.

**Happy path**

- Valid `userName` and `password` for an existing user → `200` with a non-null `token`, a non-null ISO-8601 `expires`, `status: "Success"` and `result: "User authorized successfully."`.

**Negative cases**

- Correct `userName`, wrong `password`.
- `userName` that was never registered, with any password.
- `userName` key absent from the request body.
- `password` key absent from the request body.
- `userName` present but empty string.
- `password` present but empty string.

**Boundary cases**

- `password`: empty string (0 chars) is the one derivable boundary — it is the zero-length edge of a required string field. No minimum/maximum length rule applies to this endpoint: complexity rules belong to `POST /Account/v1/User` at registration time, and this endpoint only compares a submitted password against a stored one. A 7-character password is not a boundary here, merely a wrong password.
- `userName`: empty string (0 chars), same reasoning. No documented length or format constraint exists to bound the upper end — see COND-AUTH-INF-002 in `post-user.md` for the same field, not duplicated here.

**Authorization states**

- Not applicable — this endpoint issues credentials rather than consuming them. It takes no `Authorization` header, and sending one has no documented effect.

**Status codes and response shape**

| Scenario                                      | Status | Response                                                                                                                                                                    |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Valid credentials                             | 200    | `{ token: string, expires: string (ISO date), status: "Success", result: "User authorized successfully." }` — live-confirmed                                                |
| Wrong password for an existing user           | 200    | `{ token: null, expires: null, status: "Failed", result: "User authorization failed." }` — live-confirmed. Note the `200`: an authentication failure under a success status |
| Non-existent username                         | 200    | Byte-identical to the wrong-password row — live-confirmed as indistinguishable from the response alone                                                                      |
| Missing or empty `userName` and/or `password` | 400    | `{ code: "1200", message: "UserName and Password required." }` — **live-verified 2026-09-04** on this endpoint; the required-field check runs before authentication         |

**Spec ambiguities / unknowns**

- ~~The corrected spec doc's table for this endpoint covers only the three `200` rows; it does not state what a missing or empty `userName`/`password` returns.~~ Resolved by live check 2026-09-04 — all four variants (absent/empty × `userName`/`password`) return `400`/`1200`, deterministic across two runs each with a valid-credentials control in the same pass. `docs/api-spec/account-endpoints.md` was updated in the same pass. See COND-AUTH-025 through COND-AUTH-028.
- ~~Whether an absent key and a present-but-empty string differ.~~ Resolved by the same check — they do not, matching `POST /Account/v1/User`.
- The issued `token` was observed to be an unsigned-decodable JWT carrying the plaintext password in its payload. Recorded in the spec doc as an observation; not raised to a condition, since this project asserts the documented contract rather than auditing token design.
- The `expires` field is documented as an ISO date string but no lifetime is stated, so no assertion about the token's validity window is derivable. Token expiry itself is infeasible to test — see COND-AUTH-INF-009.
- Swagger documents the `MessageModal` `code` field as `number`; every endpoint sharing that schema is live-confirmed to return a **string**. Applied here without re-verification.

---

## Input fields

### COND-AUTH-022: Valid credentials return a token with the live-confirmed success shape

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-022                                         |
| Priority   | High                                                  |
| Category   | Input field                                           |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-022                                              |

**What to cover**
The valid equivalence class: a previously-registered user submits their own correct `userName` and `password`, and receives `200` with a non-null `token`, a non-null ISO-8601 `expires`, `status: "Success"` and `result: "User authorized successfully."`.

**Values / boundaries**

```
# EP
Valid class: a freshly-registered user's own credentials, e.g. userName "qa_<timestamp>", password "Test@1234"
Expected status: 200
Expected body: token — non-null, non-empty string
               expires — non-null ISO-8601 date string
               status — "Success"
               result — "User authorized successfully."
```

**Notes**
This is the sole happy path, and every other endpoint in the project that requires a bearer token depends on it working — a failure here blocks `GET` and `DELETE /Account/v1/User/{UUID}` entirely. Priority High on that basis.

Trigger and effect are merged into one condition, following the precedent of COND-AUTH-001, COND-AUTH-012 and COND-AUTH-017: "valid credentials are accepted" and "the success response has shape X" are not independently testable.

Asserting `token` is non-null is the substantive part, not incidental: the failure response (COND-AUTH-023) also returns `200`, and differs only in the body. A test asserting status alone would pass against a failed authentication.

---

### COND-AUTH-023: Wrong password returns a failure body under HTTP 200

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-023                                         |
| Priority   | High                                                  |
| Category   | Input field                                           |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-023                                              |

**What to cover**
Invalid equivalence class: an existing user's correct `userName` is submitted with a password that is not theirs. Confirms the API reports the failure in the body — `token: null`, `status: "Failed"` — while still returning HTTP `200`.

**Values / boundaries**

```
# EP
Invalid class — wrong password: a registered user's userName with password "Wrong@9999"
Expected status: 200
Expected body: token — null
               expires — null
               status — "Failed"
               result — "User authorization failed."
```

**Notes**
The `200` is the point of the condition. A client branching on `res.ok` would treat a rejected login as a successful one and carry a `null` token forward — the same trap documented for `DELETE /Account/v1/User/{UUID}` (COND-AUTH-021). Asserting the status explicitly, alongside the body, is what makes this test worth having.

Priority High rather than Medium despite being a negative path: an authentication endpoint that fails to reject wrong credentials is a security defect, not an edge case.

`token` and `expires` must be asserted as explicitly `null`, not merely absent — the live-confirmed body carries both keys with null values.

---

### COND-AUTH-024: Non-existent username returns the same failure body as a wrong password

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-024                                         |
| Priority   | Medium                                                |
| Category   | Input field                                           |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | AUTH-024                                              |

**What to cover**
Invalid equivalence class: a `userName` that was never registered, submitted with any syntactically valid password. Confirms the response is indistinguishable from the wrong-password case — the API does not reveal whether the account exists.

**Values / boundaries**

```
# EP
Invalid class — unknown user: userName "qa_never_registered_<timestamp>", password "Test@1234"
Expected status: 200
Expected body: token — null
               expires — null
               status — "Failed"
               result — "User authorization failed."
```

**Notes**
Kept separate from COND-AUTH-023 despite the byte-identical response: "user exists, password wrong" and "user does not exist" are genuinely distinct invalid input classes, and the EP coverage rule requires a condition per class even when the documented outcome is identical. Same reasoning that keeps COND-AUTH-018 and COND-AUTH-019 separate in `delete-user.md`.

The indistinguishability is itself the property under test — it prevents username enumeration. Should a future change make the two responses differ, this condition is what catches it.

---

### COND-AUTH-025: Empty password is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-025                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | BVA                                                                          |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | AUTH-025                                                                     |

**What to cover**
The zero-length boundary of the required `password` field: an existing user's correct `userName` is submitted with `password: ""`. Confirms the request is rejected as a missing required field (`400`/`1200`) rather than taking the authentication path and returning `200`/`"Failed"`.

**Values / boundaries**

```
# BVA
Empty (0 chars): { userName: "<registered user>", password: "" }
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
The distinction this condition protects is which of two paths an empty password takes. Live check 2026-09-04 settles it: `400`/`1200`, **not** the `200`/`"Failed"` authentication response — the required-field check short-circuits before any credential comparison. Both outcomes were plausible from the outside, which is exactly why the case is worth a test.

Verified on this endpoint directly, not inherited from `POST /Account/v1/User`; the two do agree, and `docs/api-spec/account-endpoints.md` now carries a row for each.

---

### COND-AUTH-026: Empty userName is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-026                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | BVA                                                                          |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | AUTH-026                                                                     |

**What to cover**
The zero-length boundary of the required `userName` field: `userName: ""` submitted with an otherwise valid password. Confirms rejection as a missing required field rather than treatment as an unknown user.

**Values / boundaries**

```
# BVA
Empty (0 chars): { userName: "", password: "Test@1234" }
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
As with COND-AUTH-025, the competing outcome is the `200`/`"Failed"` unknown-user response (COND-AUTH-024) — an empty username is, after all, a username nobody has. Live check 2026-09-04 confirms the required-field check runs first: `400`/`1200`.

---

### COND-AUTH-027: Absent userName key is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-027                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | EP                                                                           |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | AUTH-027                                                                     |

**What to cover**
Invalid equivalence class: the `userName` key is entirely absent from the request body, which carries only `password`. Confirms rejection with the shared required-field error.

**Values / boundaries**

```
# EP
Invalid class — key absent: { password: "Test@1234" }
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Kept separate from COND-AUTH-026 (empty string) because absent-key and present-but-empty are distinct invalid input classes at the HTTP level, even though the live check 2026-09-04 confirms this endpoint collapses them onto one code path. The EP rule requires a condition per class regardless of shared outcome — the same treatment given COND-AUTH-008/COND-AUTH-010 in `post-user.md`.

Sending a body with a key genuinely absent requires a raw request rather than a typed client call, since the client signature models the real API contract.

---

### COND-AUTH-028: Absent password key is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-028                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | EP                                                                           |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | AUTH-028                                                                     |

**What to cover**
Invalid equivalence class: the `password` key is entirely absent from the request body, which carries only `userName`. Confirms rejection with the shared required-field error.

**Values / boundaries**

```
# EP
Invalid class — key absent: { userName: "<registered user>" }
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
```

**Notes**
Separate from COND-AUTH-025 for the same reason COND-AUTH-027 is separate from COND-AUTH-026: absent key and empty value are distinct classes.

---

## Infeasible conditions

### COND-AUTH-INF-009: Token expiry behavior (infeasible)

| Field      | Value                                                     |
| ---------- | --------------------------------------------------------- |
| ID         | COND-AUTH-INF-009                                         |
| Priority   | Medium                                                    |
| Category   | State                                                     |
| Technique  | BVA                                                       |
| Source     | Spec: `expires` field, docs/api-spec/account-endpoints.md |
| Test cases | —                                                         |

**What to cover**
That a token stops being accepted once the moment named in its `expires` field has passed — and, at the boundary, is still accepted immediately before it.

**Why infeasible**
The response documents `expires` as an ISO date but states no lifetime, and observed values put it far enough ahead that a test would have to idle for the full window. There is no way to force expiry from outside: DemoQA exposes no clock control, no token-revocation endpoint, and no shorter-lived token variant. A test would be a real-time wait of unknown length against a shared public backend.

**Mitigation**
Contract assumption: `expires` is asserted as a non-null, parseable ISO-8601 date string in COND-AUTH-022, which is as far as the field can be verified without waiting out its window. The rejection side is partially covered by COND-AUTH-019 in `delete-user.md` and COND-AUTH-014 in `get-user.md`, which confirm an invalid token is refused — an expired token is expected to join that class, though that expectation is untested.

---

### COND-AUTH-INF-010: Repeated token generation — whether a prior token is invalidated (infeasible)

| Field      | Value                                          |
| ---------- | ---------------------------------------------- |
| ID         | COND-AUTH-INF-010                              |
| Priority   | Low                                            |
| Category   | State                                          |
| Technique  | Exploratory heuristic                          |
| Source     | Heuristic — undocumented in either spec source |
| Test cases | —                                              |

**What to cover**
Whether calling this endpoint twice for the same user issues an independent second token that leaves the first still usable, or supersedes it.

**Why infeasible**
Resolving this requires generating a second token and then confirming the _first_ still authenticates — which means exercising a protected endpoint (`GET /Account/v1/User/{UUID}`) as the assertion. That makes it a test of the protected endpoint's token handling, not of `GenerateToken`'s own response, and it cannot be settled from this endpoint's response alone. Deliberately scoped out rather than technically unreachable: a live probe would resolve it, but it belongs to a session-management test area this project does not cover.

**Mitigation**
Deferred. Every test in the suite that needs a token generates its own and uses it immediately, so no test depends on a previously-issued token surviving a later generation. If a multi-session area is ever added, this becomes feasible and should be promoted.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — COND-AUTH-022 covers the valid class for both `userName` and `password` together, which is the only way they can be valid                                                                                                                         |
| Does every required input field have at least one invalid EP condition?                | Yes — `password`: COND-AUTH-023 (wrong), COND-AUTH-025 (empty), COND-AUTH-028 (absent). `userName`: COND-AUTH-024 (unknown), COND-AUTH-026 (empty), COND-AUTH-027 (absent)                                                                              |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes for the empty boundary — COND-AUTH-025 (`password`), COND-AUTH-026 (`userName`). No min/max length rule exists on this endpoint to bound: complexity belongs to registration, and the `userName` upper bound is COND-AUTH-INF-002 in `post-user.md` |
| Does every authorization state produce a distinct condition?                           | Not applicable — this endpoint issues credentials rather than consuming them; it takes no `Authorization` header                                                                                                                                        |
| Are all infeasible conditions documented?                                              | Yes — COND-AUTH-INF-009 (token expiry), COND-AUTH-INF-010 (repeat generation)                                                                                                                                                                           |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                                                                                                                 |
| Are all conditions independently testable?                                             | Yes — each seeds its own user where one is needed; none depends on another having run first. No condition consumes or invalidates state another condition relies on                                                                                     |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — COND-AUTH-022 already merges its trigger with its response shape. COND-AUTH-023 and COND-AUTH-024 return identical bodies but are reached through different inputs, so neither is the other's effect                                               |

**Analysis-to-condition mapping**

- Happy path (valid credentials → token, Success) → COND-AUTH-022
- Negative: correct userName, wrong password → COND-AUTH-023
- Negative: non-existent userName → COND-AUTH-024
- Negative: userName key absent → COND-AUTH-027
- Negative: password key absent → COND-AUTH-028
- Negative: userName empty string → COND-AUTH-026
- Negative: password empty string → COND-AUTH-025
- Boundary: password empty (0 chars) → COND-AUTH-025
- Boundary: userName empty (0 chars) → COND-AUTH-026
- Boundary: userName upper length/format → COND-AUTH-INF-002 in `post-user.md` (same field, not duplicated)
- Authorization states: not applicable → no condition, justified in the analysis block
- Status codes/response shape: 200 success, 200 failure, 400/1200 required-field → COND-AUTH-022, COND-AUTH-023, COND-AUTH-024, COND-AUTH-025, COND-AUTH-026, COND-AUTH-027, COND-AUTH-028
- Spec ambiguity: required-field behavior resolved by live check 2026-09-04 → COND-AUTH-025 through COND-AUTH-028
- Spec ambiguity: `expires` lifetime unstated → COND-AUTH-INF-009

**Coverage gaps identified**

- None. The one previously-open gap — the `400`/`1200` required-field behavior asserted by COND-AUTH-025 through COND-AUTH-028, originally inherited from `POST /Account/v1/User` rather than verified here — was live-checked 2026-09-04 and confirmed on this endpoint directly. `docs/api-spec/account-endpoints.md` was updated in the same pass, so the project's source of truth now carries a GenerateToken row for it.
- Whether an `Authorization` header sent to this endpoint is ignored is undocumented and untested. Not raised to a condition: no client would send one, and the endpoint declares no security scheme.

**Deferred conditions**

- COND-AUTH-INF-009 (token expiry) — deferred indefinitely; needs clock control the SUT does not offer.
- COND-AUTH-INF-010 (repeat token generation) — deferred as out of scope; would become feasible if a session-management area is added.
