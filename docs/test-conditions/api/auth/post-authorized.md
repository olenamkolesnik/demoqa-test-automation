# Test Conditions — POST /Account/v1/Authorized

## Endpoint analysis

**Endpoint:** POST /Account/v1/Authorized
**Source:** OpenAPI spec (`docs/api-spec/book-store-api.swagger.json`) cross-checked against observed live behavior (`docs/api-spec/account-endpoints.md`), extended by live check 2026-09-04. Live behavior wins wherever the two disagree.

**What this endpoint actually reports (established by live check 2026-09-04)**

The name is misleading and this shapes every condition below. Submitting a user's own correct `userName` and `password` does **not** reliably return `true`. A freshly-registered user who has never called `POST /Account/v1/GenerateToken` receives `200` with the bare boolean **`false`**; the same request returns `true` only after that user has generated a token at least once. Confirmed on three independent users, each observed `false` before token generation and `true` after, within the same pass.

So the endpoint answers "does this user currently hold a token?", not "are these credentials valid?" — and `false` is a legitimate, credential-correct outcome, not an error. That splits what would naively be a single happy path into two distinct valid classes, and it makes the `true` case depend on a precondition (`GenerateToken` must have run for this user) rather than on the request body alone.

**Happy path**

- Correct `userName` and `password` for a user who has already generated a token → `200` with the bare boolean `true`.
- Correct `userName` and `password` for a registered user who has never generated a token → `200` with the bare boolean `false`. Also a valid-credentials class, distinguished only by session state.

**Negative cases**

- Correct `userName`, wrong `password` → `404`/`1207`, regardless of whether the user holds a token.
- `userName` that was never registered, with any password → `404`/`1207`, byte-identical to the wrong-password response.
- `userName` key absent from the request body.
- `password` key absent from the request body.
- `userName` present but empty string.
- `password` present but empty string.

**Boundary cases**

- `password`: empty string (0 chars) is the one derivable boundary — the zero-length edge of a required string field. No minimum/maximum length rule applies here: complexity rules belong to `POST /Account/v1/User` at registration time, and this endpoint only compares a submitted password against a stored one. A 7-character password is not a boundary here, merely a wrong password.
- `userName`: empty string (0 chars), same reasoning. No documented length or format constraint bounds the upper end — see COND-AUTH-INF-002 in `post-user.md` for the same field, not duplicated here.

**Authorization states**

- Not applicable as a request dimension — this endpoint takes no `Authorization` header; it identifies the user from the body. Token state _is_ nonetheless the decisive state variable, but it is carried server-side rather than in the request, so it is modeled below as a State condition (COND-AUTH-029 / COND-AUTH-030) rather than an Authorization one.

**Status codes and response shape**

| Scenario                                         | Status | Response                                                                                                                                            |
| ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correct credentials, user has generated a token  | 200    | `true` — bare JSON boolean, **not** an object. **Live-verified 2026-09-04**                                                                         |
| Correct credentials, user has never held a token | 200    | `false` — bare JSON boolean. **Live-verified 2026-09-04**; same status as the `true` case, so status alone carries no information                   |
| Wrong password for an existing user              | 404    | `{ code: "1207", message: "User not found!" }` — live-confirmed. The message is misleading: it is a password mismatch, not a missing user           |
| Non-existent username                            | 404    | Byte-identical to the wrong-password row — **live-verified 2026-09-04** as indistinguishable from the response alone                                |
| Missing or empty `userName` and/or `password`    | 400    | `{ code: "1200", message: "UserName and Password required." }` — **live-verified 2026-09-04** on this endpoint; the required-field check runs first |

Note the response body's _type_ varies with the outcome: a JSON scalar on `200`, a `MessageModal` object on `400` and `404`. Both are served as `Content-Type: application/json; charset=utf-8`.

**Spec ambiguities / unknowns**

- ~~The spec doc's table recorded only two rows — `200`/`true` for "Success" and `404`/`1207` for a wrong password — implying correct credentials always yield `true`.~~ Resolved by live check 2026-09-04: correct credentials yield `false` until the user has generated a token. `docs/api-spec/account-endpoints.md` was corrected in the same pass, and its provenance header amended.
- ~~The spec doc stated a non-existent username "presumably produces the same response (not separately tested)".~~ Resolved by live check 2026-09-04 — it does, byte-identically, across two unregistered usernames and two runs each. See COND-AUTH-032.
- ~~What a missing or empty `userName`/`password` returns on this endpoint was undocumented, and could not be inherited from `POST /Account/v1/GenerateToken` because this endpoint uses a different error vocabulary (`404`/`1207` rather than `200`/`"Failed"`).~~ Resolved by live check 2026-09-04 — all four variants return `400`/`1200`, the same shared required-field error as `POST /Account/v1/User` and `POST /Account/v1/GenerateToken`, deterministic across two runs each. See COND-AUTH-033 through COND-AUTH-036.
- ~~Whether an absent key and a present-but-empty string differ.~~ Resolved by the same check — they do not, matching both sibling endpoints.
- Whether a token that has _expired_ flips the answer back to `false` is unknown and untestable within a suite run — see COND-AUTH-INF-011.
- Whether deleting the user via `DELETE /Account/v1/User/{UUID}` changes the answer is untested; the deleted user's credentials would presumably fall into the `404`/`1207` class, but this is not confirmed and is not raised to a condition — it belongs to `delete-user.md`'s state area, not this endpoint's request contract.
- Swagger documents the `MessageModal` `code` field as `number`; every endpoint sharing that schema is live-confirmed to return a **string**. Applied here, and independently re-confirmed for this endpoint in the 2026-09-04 pass (`"1207"` and `"1200"` both observed quoted).

---

## State

### COND-AUTH-029: A user holding a token is reported authorized as the bare boolean true

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-029                                                                |
| Priority   | High                                                                         |
| Category   | State                                                                        |
| Technique  | Decision table                                                               |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

**What to cover**
The valid class in which the endpoint answers affirmatively: a registered user who has already obtained a token via `POST /Account/v1/GenerateToken` submits their own correct `userName` and `password`, and receives `200` with a response body that is the bare JSON boolean `true`.

**Values / boundaries**

```
# Decision table
Correct credentials + user has generated a token → 200, body === true

Precondition: user created via POST /Account/v1/User, then POST /Account/v1/GenerateToken called for that same user
Request: { userName: "qa_<timestamp>", password: "Test@1234" }
Expected status: 200
Expected body: the JSON scalar true — strictly boolean true, not a truthy object, not the string "true"
```

**Notes**
The bare boolean is the point worth labouring, because it is unique in this API and it breaks the assertion habits every other endpoint here teaches. There is no `status`, `code`, `message` or `result` field to key off; the entire payload is the literal token `true`. Three consequences follow, and the test must respect all three:

The response schema cannot be an object schema. Every other `/Account` response validates against an object shape; this one validates against a boolean primitive. A zod schema written by analogy with the siblings will reject a perfectly correct response.

Truthiness is not a valid assertion. The failure counterpart (COND-AUTH-030) is `false` under the _same_ `200` status, so `expect(body).toBeTruthy()` and `if (body)` both silently accept only half the contract. The assertion must be identity against `true`, and the status must be asserted separately since it does not discriminate.

A response-body length or "is non-empty" check is meaningless here — `false` is also a non-empty body.

Priority High because this, and not the `false` case, is what a caller uses the endpoint for, and because the `true`/`false` distinction is exactly what a naive implementation gets wrong.

The token-generation precondition is genuine and non-obvious — see COND-AUTH-030 for why it cannot be assumed away. A test that seeds only via `POST /Account/v1/User` will observe `false` and fail, having tested nothing wrong.

Trigger and effect are merged into one condition, following COND-AUTH-001, COND-AUTH-012, COND-AUTH-017 and COND-AUTH-022: "a token-holding user's credentials are accepted" and "the response is `true`" are not independently testable.

---

### COND-AUTH-030: Correct credentials for a user who has never generated a token return the bare boolean false

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-030                                                                |
| Priority   | High                                                                         |
| Category   | State                                                                        |
| Technique  | Decision table                                                               |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

**What to cover**
The second valid-credentials class: a registered user who has never called `POST /Account/v1/GenerateToken` submits their own correct `userName` and `password`, and receives `200` with the bare boolean `false`. Confirms the endpoint reports token/session state rather than credential validity, and that a correct-credentials request can legitimately answer negatively without being an error.

**Values / boundaries**

```
# Decision table
Correct credentials + user has NEVER generated a token → 200, body === false

Precondition: user created via POST /Account/v1/User only; POST /Account/v1/GenerateToken never called for this user
Request: { userName: "qa_<timestamp>", password: "Test@1234" }
Expected status: 200
Expected body: the JSON scalar false — strictly boolean false
Expected NOT: 404 / { code: "1207", ... } — the credentials are correct, so the not-found path is not taken
```

**Notes**
This is the finding that reshaped the whole file. The spec doc previously recorded only "Success → `true`", which reads as "correct credentials → `true`". Live check 2026-09-04 shows that is wrong: three users, each created and immediately queried with their own correct credentials, all returned `false`; each then returned `true` after a single `GenerateToken` call, with nothing else changed. The result was stable across users and repeats, so it is a finding rather than an observation. `docs/api-spec/account-endpoints.md` now carries a row for it.

Kept as a separate condition from COND-AUTH-029 rather than merged, because the two are not a trigger and its effect — they are two different states of the same valid input class, reached by different preconditions and producing different outcomes. That is exactly what the Decision table technique is for.

Priority High, not Medium, despite looking like a negative path: it is not a negative path. Getting this wrong in the other direction is the more expensive mistake — a fixture that authenticates a user and asserts `true` without generating a token will fail for a reason that has nothing to do with the code under test, and a client that reads `false` as "bad credentials" will report a wrong diagnosis to its user.

The `false` here and the `404`/`1207` of COND-AUTH-031 are genuinely different answers about a genuinely existing user, and both are reachable with a real username. Asserting the status alone distinguishes them; asserting the body alone does not distinguish `false` from a `404` body that happens to be falsy in a loosely-typed client. Assert both.

---

## Input fields

### COND-AUTH-031: Wrong password returns 404 with the misleading "User not found!" error

| Field      | Value                                                 |
| ---------- | ----------------------------------------------------- |
| ID         | COND-AUTH-031                                         |
| Priority   | High                                                  |
| Category   | Input field                                           |
| Technique  | EP                                                    |
| Source     | Observed behavior: docs/api-spec/account-endpoints.md |
| Test cases | —                                                     |

**What to cover**
Invalid equivalence class: an existing user's correct `userName` is submitted with a password that is not theirs. Confirms `404` with `{ code: "1207", message: "User not found!" }` — an error response, not a `200`/`false`.

**Values / boundaries**

```
# EP
Invalid class — wrong password: a registered user's userName with password "Wrong@9999"
Expected status: 404
Expected body: { code: "1207", message: "User not found!" }
Expected NOT: 200 with body false — a wrong password is not the same outcome as a tokenless user
```

**Notes**
The value of this condition is the boundary it draws against COND-AUTH-030. Both involve a real, registered user; only the password differs; and the two outcomes are structurally different — one is a `200` carrying a scalar, the other a `404` carrying an object. Confirmed 2026-09-04 that this holds regardless of the user's token state: a wrong password returned `404`/`1207` both for a user who had generated a token and for one who had not, so token state does not shadow the credential check.

The message text "User not found!" is factually wrong for this case — the user exists, the password does not match — but it is the real, live behavior and the test asserts it as such. Do not "correct" it in the expected value.

Priority High for the same reason as COND-AUTH-023 in `post-generate-token.md`: an endpoint that fails to reject wrong credentials is a security defect, not an edge case.

`1207` is this API's general "no such user" code, but neither its wrapping status nor its message text is shared across endpoints — `GET /Account/v1/User/{UUID}` pairs `1207`/"User not found!" with `401`, and `DELETE` pairs `1207`/"User Id not correct!" with `200`. Assert this endpoint's own pairing; do not reuse another's.

---

### COND-AUTH-032: Non-existent username returns the same 404 as a wrong password

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-032                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | EP                                                                           |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

**What to cover**
Invalid equivalence class: a `userName` that was never registered, submitted with any syntactically valid password. Confirms the response is byte-identical to the wrong-password case — the API does not reveal whether the account exists.

**Values / boundaries**

```
# EP
Invalid class — unknown user: userName "qa_never_registered_<timestamp>", password "Test@1234"
Expected status: 404
Expected body: { code: "1207", message: "User not found!" }
```

**Notes**
The spec doc previously guessed at this ("presumably produces the same response (not separately tested)"). Live check 2026-09-04 confirms the guess: two distinct never-registered usernames each returned `404`/`1207`, identical to the wrong-password response, across two runs. The spec doc's hedge has been replaced with a verified row.

Kept separate from COND-AUTH-031 despite the identical response: "user exists, password wrong" and "user does not exist" are genuinely distinct invalid input classes, and the EP rule requires a condition per class even when the documented outcome is identical. Same reasoning that keeps COND-AUTH-023 and COND-AUTH-024 separate in `post-generate-token.md`, and COND-AUTH-018/019 in `delete-user.md`.

The indistinguishability is itself the property under test — it prevents username enumeration, and here the misleading "User not found!" text is what makes it work: the message that is wrong for COND-AUTH-031 is precisely what stops an attacker separating the two cases. Should a future change make the responses differ, this condition is what catches it.

Priority Medium rather than High: the enumeration protection matters, but unlike COND-AUTH-031 no access is granted either way.

---

### COND-AUTH-033: Empty password is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-033                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | BVA                                                                          |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

**What to cover**
The zero-length boundary of the required `password` field: an existing user's correct `userName` is submitted with `password: ""`. Confirms rejection as a missing required field (`400`/`1200`) rather than as a credential mismatch (`404`/`1207`).

**Values / boundaries**

```
# BVA
Empty (0 chars): { userName: "<registered user>", password: "" }
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
Expected NOT: 404 / { code: "1207", message: "User not found!" }
```

**Notes**
This is the case the task could not safely infer. `POST /Account/v1/GenerateToken` returns `400`/`1200` here, but that endpoint's whole error vocabulary differs from this one's — it answers bad credentials with `200`/`"Failed"` where this endpoint answers `404`/`1207` — so there was no basis for assuming the required-field path was shared. It plausibly could have been `404`/`1207` ("empty password matches nobody"), keeping this endpoint's vocabulary self-consistent.

Live check 2026-09-04 settles it: `400`/`1200`, the same shared required-field error as `POST /Account/v1/User` and `POST /Account/v1/GenerateToken`, deterministic across two runs. The required-field check short-circuits before any credential lookup, so an empty password never reaches the comparison. Verified on this endpoint directly, not inherited; `docs/api-spec/account-endpoints.md` now carries its own row.

The practical consequence: this endpoint returns errors in two different vocabularies depending on the failure kind, and status code alone tells you which. A client mapping this endpoint's errors must handle `400`/`1200` as well as `404`/`1207`.

---

### COND-AUTH-034: Empty userName is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-034                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | BVA                                                                          |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

**What to cover**
The zero-length boundary of the required `userName` field: `userName: ""` submitted with an otherwise valid password. Confirms rejection as a missing required field rather than treatment as an unknown user.

**Values / boundaries**

```
# BVA
Empty (0 chars): { userName: "", password: "Test@1234" }
Expected status: 400
Expected body: { code: "1200", message: "UserName and Password required." }
Expected NOT: 404 / { code: "1207", message: "User not found!" }
```

**Notes**
The competing outcome here is more tempting than in COND-AUTH-033 — an empty username is, after all, a username nobody has, and `404`/"User not found!" would have been a perfectly coherent answer for this endpoint. Live check 2026-09-04 confirms the required-field check runs first: `400`/`1200`, across two runs.

---

### COND-AUTH-035: Absent userName key is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-035                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | EP                                                                           |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

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
Kept separate from COND-AUTH-034 (empty string) because absent-key and present-but-empty are distinct invalid input classes at the HTTP level, even though live check 2026-09-04 confirms this endpoint collapses them onto one code path. The EP rule requires a condition per class regardless of shared outcome — the same treatment given COND-AUTH-008/010 in `post-user.md` and COND-AUTH-026/027 in `post-generate-token.md`.

Sending a body with a key genuinely absent requires a raw request rather than a typed client call, since the client signature models the real API contract.

---

### COND-AUTH-036: Absent password key is rejected as a required-field violation

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-036                                                                |
| Priority   | Medium                                                                       |
| Category   | Input field                                                                  |
| Technique  | EP                                                                           |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

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
Separate from COND-AUTH-033 for the same reason COND-AUTH-035 is separate from COND-AUTH-034: absent key and empty value are distinct classes.

Live check 2026-09-04 additionally confirmed that a wholly empty body `{}` — both keys absent — returns the same `400`/`1200`. Not raised to its own condition: it is the intersection of COND-AUTH-035 and COND-AUTH-036 rather than a further class, and it produces no distinct outcome, so a condition for it would violate the no-trigger/effect-splitting rule without adding coverage.

---

## Infeasible conditions

### COND-AUTH-INF-011: Whether token expiry flips the answer back to false (infeasible)

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| ID         | COND-AUTH-INF-011                                                            |
| Priority   | Medium                                                                       |
| Category   | State                                                                        |
| Technique  | BVA                                                                          |
| Source     | Observed behavior: live check 2026-09-04; docs/api-spec/account-endpoints.md |
| Test cases | —                                                                            |

**What to cover**
Given that this endpoint answers `true` once a user holds a token (COND-AUTH-029) and `false` before they ever have one (COND-AUTH-030), whether it reverts to `false` after that token's `expires` moment has passed — and, at the boundary, still answers `true` immediately before it.

**Why infeasible**
Reaching the state needs a token that has actually expired. `POST /Account/v1/GenerateToken` returns an `expires` observed roughly seven days ahead of issuance, and DemoQA exposes no clock control, no token-revocation endpoint, and no shorter-lived token variant. Testing this would mean a real-time wait of about a week against a shared public backend. This is the same wall as COND-AUTH-INF-009 in `post-generate-token.md`, reached from the other side: that one asks whether an expired token is refused by a protected endpoint, this one asks whether the session flag this endpoint reads is derived from a live token or from a one-way "has ever generated" flag that never resets.

The distinction matters more than the expiry timing does. If the flag never resets, `true` means "this user generated a token at some point", which is a materially weaker statement than "this user is currently authorized" — and no test in this suite would notice.

**Mitigation**
Contract assumption: the `true`/`false` split is asserted only against the states this suite can actually create — token generated within the same test (COND-AUTH-029) and never generated (COND-AUTH-030). Every test needing `true` generates its own token immediately beforehand, so no test depends on a token surviving any interval. If DemoQA ever exposes a short-lived token or a revocation path, promote this to a real State condition.

---

### COND-AUTH-INF-012: Whether the flag is per-token or per-user after a second token generation (infeasible)

| Field      | Value                                          |
| ---------- | ---------------------------------------------- |
| ID         | COND-AUTH-INF-012                              |
| Priority   | Low                                            |
| Category   | State                                          |
| Technique  | Exploratory heuristic                          |
| Source     | Heuristic — undocumented in either spec source |
| Test cases | —                                              |

**What to cover**
Whether the state this endpoint reports is attached to a specific token or to the user account — i.e. whether generating a second token for the same user changes the answer in any observable way, and whether it would still answer `true` if the first token were somehow invalidated.

**Why infeasible**
Not technically unreachable: a second `GenerateToken` call is trivial to make. It is unresolvable because this endpoint's response cannot distinguish the two models — it answers `true` under both, since a user with two tokens has at least one token either way. Separating them would require invalidating one token and re-querying, and DemoQA offers no revocation. This is the same scope boundary as COND-AUTH-INF-010 in `post-generate-token.md`, which defers repeat-token-generation semantics to a session-management area this project does not cover.

**Mitigation**
Deferred as out of scope. No test asserts anything about which token the `true` refers to; COND-AUTH-029 asserts only that a token-holding user is reported as `true`, which holds under either model. Becomes feasible if a token-revocation endpoint or a session-management test area appears.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — COND-AUTH-029 and COND-AUTH-030 both cover the valid class for `userName` and `password` together (the only way they can be valid), across the two token states                                                                                                                               |
| Does every required input field have at least one invalid EP condition?                | Yes — `password`: COND-AUTH-031 (wrong), COND-AUTH-033 (empty), COND-AUTH-036 (absent). `userName`: COND-AUTH-032 (unknown), COND-AUTH-034 (empty), COND-AUTH-035 (absent)                                                                                                                          |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes for the empty boundary — COND-AUTH-033 (`password`), COND-AUTH-034 (`userName`). No min/max length rule exists on this endpoint to bound: complexity belongs to registration, and the `userName` upper bound is COND-AUTH-INF-002 in `post-user.md`, not duplicated here                        |
| Does every authorization state produce a distinct condition?                           | Not applicable as a request dimension — the endpoint takes no `Authorization` header. The server-side token state that governs the outcome is covered as State: COND-AUTH-029 (has token), COND-AUTH-030 (never had one), COND-AUTH-INF-011 (expired), COND-AUTH-INF-012 (second token)             |
| Are all infeasible conditions documented?                                              | Yes — COND-AUTH-INF-011 (expired-token state), COND-AUTH-INF-012 (per-token vs. per-user flag)                                                                                                                                                                                                      |
| Does every analysis bullet map to at least one condition?                              | Yes — see mapping below                                                                                                                                                                                                                                                                             |
| Are all conditions independently testable?                                             | Yes — each seeds its own user, and COND-AUTH-029 generates its own token as part of its precondition. No condition depends on another having run, and none consumes or invalidates state another relies on. COND-AUTH-030 in particular must use a user no other condition has tokenized            |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — COND-AUTH-029 already merges its trigger with its `true` response. COND-AUTH-029 and COND-AUTH-030 need different preconditions and yield different bodies, so neither is the other's effect. COND-AUTH-031 and COND-AUTH-032 return identical bodies but are reached through different inputs |

**Analysis-to-condition mapping**

- Happy path (correct credentials, user holds a token → `true`) → COND-AUTH-029
- Happy path (correct credentials, user never held a token → `false`) → COND-AUTH-030
- Bare-boolean response body and its assertion/typing consequences → COND-AUTH-029 (Notes), reinforced by COND-AUTH-030
- Negative: correct userName, wrong password → COND-AUTH-031
- Negative: non-existent userName → COND-AUTH-032
- Negative: userName key absent → COND-AUTH-035
- Negative: password key absent → COND-AUTH-036
- Negative: userName empty string → COND-AUTH-034
- Negative: password empty string → COND-AUTH-033
- Boundary: password empty (0 chars) → COND-AUTH-033
- Boundary: userName empty (0 chars) → COND-AUTH-034
- Boundary: userName upper length/format → COND-AUTH-INF-002 in `post-user.md` (same field, not duplicated)
- Authorization states: not applicable as a request dimension → justified in the analysis block; server-side token state → COND-AUTH-029, COND-AUTH-030, COND-AUTH-INF-011, COND-AUTH-INF-012
- Status codes/response shape: `200`/`true`, `200`/`false`, `404`/`1207`, `400`/`1200` → COND-AUTH-029, COND-AUTH-030, COND-AUTH-031, COND-AUTH-032, COND-AUTH-033, COND-AUTH-034, COND-AUTH-035, COND-AUTH-036
- Spec ambiguity: "success always returns `true`" corrected by live check 2026-09-04 → COND-AUTH-029, COND-AUTH-030
- Spec ambiguity: non-existent username previously unverified, resolved by live check 2026-09-04 → COND-AUTH-032
- Spec ambiguity: required-field behavior unresolvable by inference from sibling endpoints, resolved by live check 2026-09-04 → COND-AUTH-033 through COND-AUTH-036
- Spec ambiguity: expired-token state → COND-AUTH-INF-011

**Coverage gaps identified**

- The `true` outcome is only ever observed for a token generated moments earlier within the same test. Whether it reflects a live token or a never-resetting "has ever generated" flag is unresolved and unresolvable here — documented as COND-AUTH-INF-011 rather than silently assumed.
- Whether a user deleted via `DELETE /Account/v1/User/{UUID}` falls into the `404`/`1207` class is untested. Not raised to a condition: it is a cross-endpoint state interaction belonging to `delete-user.md`'s area, not to this endpoint's request contract, and no test in this suite depends on the answer.
- Whether an `Authorization` header sent to this endpoint is ignored is undocumented and untested. Not raised to a condition: the endpoint declares no security scheme and identifies the user from the body, so no client would send one.

**Deferred conditions**

- COND-AUTH-INF-011 (expired-token state) — deferred indefinitely; needs clock control or a revocation path the SUT does not offer.
- COND-AUTH-INF-012 (per-token vs. per-user flag) — deferred as out of scope; would become feasible if token revocation or a session-management area is added.
