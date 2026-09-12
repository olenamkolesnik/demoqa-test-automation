# Test conditions — Login form (UI)

## Feature analysis

**Feature:** Login form, `https://demoqa.com/login` (UI)
**Source:** `docs/ui-spec/login-form.requirements.md` (live-verified 2026-09-07 → 2026-09-10) — the sole test basis. No live probing was performed while writing these conditions; anything the requirements file does not record is an open question, not something to resolve here.
**Test level:** System-level, black-box, per `docs/test-plan.md` §4.

**Happy path**

- Valid credentials for a registered account are accepted and hand off to the authenticated area (REQ-LOGIN-001, -002)

**Negative cases**

- Blank username, blank password, both blank — submission blocked client-side (REQ-LOGIN-010, -011, -012, -014)
- Unknown username, and wrong password for a real account — rejected by the server with a generic message that does not disclose which was wrong (REQ-LOGIN-030, -031)
- Whitespace-only input passes the required check and is submitted for server validation (REQ-LOGIN-015)

**Boundary cases**

- Empty vs. whitespace-only vs. single-character input — the required-check boundary sits exactly between 0 and 1 characters (REQ-LOGIN-010, -011, -015)
- Input length: no `maxlength` is declared and no upper limit exists — probed to 50,000 characters (REQ-LOGIN-022)

**State transitions**

- Signed out → form ready → (valid) authenticated area / (invalid) form with error, values preserved (REQ-LOGIN-001, -030, -034)
- Active session → `/login` shows no form at all, only a sign-out control (REQ-LOGIN-003)
- Blank-field marking and server-error messaging are mutually exclusive states (REQ-LOGIN-033)

**Requirements deliberately yielding no condition**

Four divergence dispositions (`docs/ui-spec/login-form.requirements.md`, accepted 2026-09-10) instruct test design to derive no condition. Recorded here so the omissions are visible, and documented as infeasible below:

- REQ-LOGIN-013 — accessible invalid state: DIVERGENCE-1, `Defect — do not automate` (accessibility out of scope, `docs/test-plan.md` §2)
- REQ-LOGIN-020 — the unenforced password `pattern`: DIVERGENCE-3, `Defect — do not automate`
- REQ-LOGIN-035 — HTTP 200 on failure: DIVERGENCE-4, `Accept as-is`, belongs to `docs/api-spec/account-endpoints.md`
- REQ-LOGIN-041 — duplicate-submission guard: DIVERGENCE-5, `Defect — do not automate`

**Spec ambiguities / unknowns**

- **Resolved 2026-09-10** — input length: no maximum exists (probed to 50,000 characters), so COND-LOGIN-FORM-005 covers an equivalence class rather than a boundary.
- **Resolved 2026-09-10** — keyboard submission: re-verified with a real keypress; REQ-LOGIN-040 is now `high` confidence.
- Whether the error message is _announced_ to assistive technology (as opposed to merely present in the accessibility tree) is unconfirmed — no `role="alert"` or live region was checked. Out of scope per `docs/test-plan.md` §2; affects COND-LOGIN-FORM-016's Notes only.

---

## Input field

### COND-LOGIN-FORM-001: Username is required

| Field      | Value                                       |
| ---------- | ------------------------------------------- |
| ID         | COND-LOGIN-FORM-001                         |
| Priority   | High                                        |
| Category   | Input field                                 |
| Technique  | EP                                          |
| Source     | REQ-LOGIN-010, REQ-LOGIN-012, REQ-LOGIN-014 |
| Test cases | LOGIN-FORM-001                              |

**What to cover**
Submitting with the username empty and the password filled blocks submission client-side and marks only the username field.

**Values / boundaries**

```
userName: ""            password: "Aa1!aaaaaaaa"   → blocked; #userName gains .is-invalid; #password stays clean; no network request
```

**Notes**
The only observable signal is the `is-invalid` CSS class — no message, no ARIA state (DIVERGENCE-1). This is the documented exception to the locator-priority rule in `docs/coding-standards.md`; the automated test must carry a comment saying why a raw CSS selector was necessary.

### COND-LOGIN-FORM-002: Password is required

| Field      | Value                                       |
| ---------- | ------------------------------------------- |
| ID         | COND-LOGIN-FORM-002                         |
| Priority   | High                                        |
| Category   | Input field                                 |
| Technique  | EP                                          |
| Source     | REQ-LOGIN-011, REQ-LOGIN-012, REQ-LOGIN-014 |
| Test cases | LOGIN-FORM-002                              |

**What to cover**
Submitting with the password empty and the username filled blocks submission client-side and marks only the password field.

**Values / boundaries**

```
userName: "qa_user_valid"   password: ""   → blocked; #password gains .is-invalid; #userName stays clean; no network request
```

**Notes**
Same CSS-selector exception as COND-LOGIN-FORM-001.

### COND-LOGIN-FORM-003: Both fields empty

| Field      | Value                                       |
| ---------- | ------------------------------------------- |
| ID         | COND-LOGIN-FORM-003                         |
| Priority   | Medium                                      |
| Category   | Input field                                 |
| Technique  | BVA                                         |
| Source     | REQ-LOGIN-010, REQ-LOGIN-011, REQ-LOGIN-012 |
| Test cases | LOGIN-FORM-003                              |

**What to cover**
Submitting with both fields empty marks both fields, confirming the check is per-field rather than form-wide.

**Values / boundaries**

```
userName: ""   password: ""   → blocked; both inputs gain .is-invalid; no network request
```

**Notes**
Empty (0 characters) is the boundary of the required check. Kept separate from COND-LOGIN-FORM-001/002 because it is the only case that demonstrates both fields marked simultaneously — the per-field rule is only fully visible across all three.

### COND-LOGIN-FORM-004: Whitespace-only input is treated as a value

| Field      | Value               |
| ---------- | ------------------- |
| ID         | COND-LOGIN-FORM-004 |
| Priority   | Medium              |
| Category   | Input field         |
| Technique  | BVA                 |
| Source     | REQ-LOGIN-015       |
| Test cases | LOGIN-FORM-004      |

**What to cover**
Whitespace-only input satisfies the required check and is submitted to the server, which rejects it — no client-side blocking occurs.

**Values / boundaries**

```
userName: "   "   password: "   "   → NOT blocked; no .is-invalid; request sent; "Invalid username or password!" displayed
```

**Notes**
Immediately above the empty boundary in COND-LOGIN-FORM-003: a string of length 0 blocks, a string of spaces does not. Behavior accepted as correct per DIVERGENCE-2 — the form does not trim before checking, and the requirement was reworded to match.

### COND-LOGIN-FORM-005: Long input is accepted intact

| Field      | Value               |
| ---------- | ------------------- |
| ID         | COND-LOGIN-FORM-005 |
| Priority   | Low                 |
| Category   | Input field         |
| Technique  | BVA                 |
| Source     | REQ-LOGIN-022       |
| Test cases | LOGIN-FORM-005      |

**What to cover**
A long credential value is neither truncated nor rejected by the form; it is submitted whole and answered by the server.

**Values / boundaries**

```
userName: "q" × 10000   password: "q" × 10000   → field value length stays 10000 before and after submit; request sent; standard rejection displayed
```

**Notes**
**There is no maximum-length boundary to test.** Neither input declares `maxlength`, and the endpoint was probed at 1 / 100 / 1,000 / 5,000 / 10,000 and 50,000 characters (2026-09-10), returning the identical rejection at every size. So no max / max+1 pair exists: this condition covers the equivalence class "very long input is handled intact", not a boundary. `BVA` is retained as the technique because the class exists only to probe where a limit would be if there were one. Low priority: no length rule exists to protect.

### COND-LOGIN-FORM-006: Special characters are transmitted intact

| Field      | Value               |
| ---------- | ------------------- |
| ID         | COND-LOGIN-FORM-006 |
| Priority   | Low                 |
| Category   | Input field         |
| Technique  | EP                  |
| Source     | REQ-LOGIN-023       |
| Test cases | LOGIN-FORM-006      |

**What to cover**
Credentials containing markup and punctuation are accepted by the form and transmitted verbatim, with no client-side sanitisation or error.

**Values / boundaries**

```
userName: "<script>'\"&;--"   password: "!@#$%^&*()_+{}|:\"<>?"   → request body carries both verbatim; standard rejection displayed
```

**Notes**
Functional observation only — this is not a security test, and `docs/test-plan.md` §2 excludes penetration testing. The condition covers "the form does not corrupt or choke on these characters", nothing about whether the server is injectable.

---

## Behavior

### COND-LOGIN-FORM-007: Valid credentials are accepted

| Field      | Value                        |
| ---------- | ---------------------------- |
| ID         | COND-LOGIN-FORM-007          |
| Priority   | High                         |
| Category   | Behavior                     |
| Technique  | EP                           |
| Source     | REQ-LOGIN-001, REQ-LOGIN-002 |
| Test cases | LOGIN-FORM-007               |

**What to cover**
Submitting the correct username and password for a registered account authenticates the user, hands off to the authenticated area, and renders no error.

**Values / boundaries**

```
userName / password: a seeded qa_-prefixed account created via POST /Account/v1/User
→ URL becomes /profile; login form no longer present; no error element rendered
```

**Notes**
The single most important condition in this file — if it fails, no authenticated journey is reachable. The account is seeded via the API; the session itself must be established through the form, because DemoQA holds it in React memory only and it cannot be injected.

### COND-LOGIN-FORM-008: Unknown username is rejected

| Field      | Value                        |
| ---------- | ---------------------------- |
| ID         | COND-LOGIN-FORM-008          |
| Priority   | High                         |
| Category   | Behavior                     |
| Technique  | EP                           |
| Source     | REQ-LOGIN-030, REQ-LOGIN-033 |
| Test cases | LOGIN-FORM-008               |

**What to cover**
A well-formed username that matches no account is rejected; the user stays on the form, the error is displayed, and no field-level invalid marking remains.

**Values / boundaries**

```
userName: "qa_nonexistent_<random>"   password: "Aa1!aaaaaaaa"
→ "Invalid username or password!" displayed; URL unchanged; no .is-invalid on either input
```

### COND-LOGIN-FORM-009: Wrong password for an existing account is rejected

| Field      | Value                        |
| ---------- | ---------------------------- |
| ID         | COND-LOGIN-FORM-009          |
| Priority   | High                         |
| Category   | Behavior                     |
| Technique  | EP                           |
| Source     | REQ-LOGIN-030, REQ-LOGIN-031 |
| Test cases | LOGIN-FORM-009               |

**What to cover**
A correct username with an incorrect password is rejected with exactly the same message as an unknown username, so the response does not disclose which credential was wrong.

**Values / boundaries**

```
userName: a seeded qa_ account   password: "WrongPass1!"
→ "Invalid username or password!" — byte-identical to COND-LOGIN-FORM-008's message
```

**Notes**
The non-disclosure property is the point of this condition, and it is only observable by comparing against COND-LOGIN-FORM-008. Both are needed; neither demonstrates it alone. A future "improvement" to a more helpful message would regress a real security property.

### COND-LOGIN-FORM-010: Entered values survive a rejected attempt

| Field      | Value               |
| ---------- | ------------------- |
| ID         | COND-LOGIN-FORM-010 |
| Priority   | Medium              |
| Category   | Behavior            |
| Technique  | EP                  |
| Source     | REQ-LOGIN-034       |
| Test cases | LOGIN-FORM-010      |

**What to cover**
After a rejected submission, both fields still hold what the user typed, so the input can be corrected rather than retyped.

**Values / boundaries**

```
userName: "qa_retained_probe"   password: "WrongPass1!"
→ after rejection, #userName.value === "qa_retained_probe" and #password.value === "WrongPass1!"
```

### COND-LOGIN-FORM-016: Authentication error is accessibly exposed

| Field      | Value               |
| ---------- | ------------------- |
| ID         | COND-LOGIN-FORM-016 |
| Priority   | Medium              |
| Category   | Behavior            |
| Technique  | EP                  |
| Source     | REQ-LOGIN-032       |
| Test cases | LOGIN-FORM-016      |

**What to cover**
The authentication error is exposed in the accessibility tree as a paragraph, not only as styled text, so it can be located by its accessible role and content.

**Values / boundaries**

```
Any rejected credential pair → error resolves as an accessibility-tree paragraph with the text "Invalid username or password!"
```

**Notes**
This is the counterpart to COND-LOGIN-FORM-INF-001: unlike the blank-field marking, the server-error message **is** accessible, so it can be asserted with `getByText` rather than a CSS selector. The requirement is `medium` confidence — the message is discoverable but has no `role="alert"` or live region, so it is unlikely to be _announced_ on appearance. This condition covers discoverability only; announcement is not tested, being an accessibility concern excluded by `docs/test-plan.md` §2.

### COND-LOGIN-FORM-011: Password stays masked after a failed attempt

| Field      | Value                 |
| ---------- | --------------------- |
| ID         | COND-LOGIN-FORM-011   |
| Priority   | Medium                |
| Category   | Behavior              |
| Technique  | Exploratory heuristic |
| Source     | REQ-LOGIN-024         |
| Test cases | LOGIN-FORM-011        |

**What to cover**
The password field remains masked after a rejected submission — a failure never exposes the typed password on screen.

**Values / boundaries**

```
Any rejected credential pair → #password retains type="password" after the error is displayed
```

**Notes**
`Exploratory heuristic` rather than EP: this is a shoulder-surfing risk check with no input classes to partition. No visibility-toggle control exists on this form.

### COND-LOGIN-FORM-012: Form is submittable by keyboard

| Field      | Value                 |
| ---------- | --------------------- |
| ID         | COND-LOGIN-FORM-012   |
| Priority   | Medium                |
| Category   | Behavior              |
| Technique  | Exploratory heuristic |
| Source     | REQ-LOGIN-040         |
| Test cases | LOGIN-FORM-012        |

**What to cover**
Pressing Enter within the form submits it, so the form can be completed without a pointer.

**Values / boundaries**

```
Fill both fields, press Enter in the password field → submission occurs (rejection message appears for invalid credentials)
```

**Notes**
Re-verified on 2026-09-10 with a genuine `keyboard.press('Enter')`, which matched the earlier synthetic-event result; REQ-LOGIN-040 was raised to `high` confidence. The automated test must use a real keypress, not a dispatched `KeyboardEvent`.

---

## State

### COND-LOGIN-FORM-013: Form is hidden when a session is already active

| Field      | Value               |
| ---------- | ------------------- |
| ID         | COND-LOGIN-FORM-013 |
| Priority   | High                |
| Category   | State               |
| Technique  | State transition    |
| Source     | REQ-LOGIN-003       |
| Test cases | LOGIN-FORM-013      |

**What to cover**
Reaching `/login` with an active session presents no login form at all — the controls are replaced by a sign-out control and an "already logged in" message with a link to the profile.

**Values / boundaries**

```
Signed-out context → /login shows the username, password and Login controls
Active session     → /login shows "You are already logged in." + Log out control; no form controls present
```

**Notes**
High priority despite being an edge case: this is the project's main test-isolation hazard. Because the session lives in React memory and cannot be cleared through storage, a leaked session from an earlier action makes every other condition in this file fail at its first locator, with an error naming the locator rather than the real cause. Every test of this form must start from a signed-out browser context (see **Constraint on test design — session isolation** in the requirements file).

### COND-LOGIN-FORM-014: Registration is reachable from the form

| Field      | Value               |
| ---------- | ------------------- |
| ID         | COND-LOGIN-FORM-014 |
| Priority   | Medium              |
| Category   | State               |
| Technique  | State transition    |
| Source     | REQ-LOGIN-051       |
| Test cases | LOGIN-FORM-014      |

**What to cover**
The New User control takes a visitor without an account from the login form to the registration page.

**Values / boundaries**

```
Click "New User" → URL becomes /register
```

**Notes**
Covers the transition only. The registration form's own behavior is out of scope for this file, and `/register` is CAPTCHA-gated, so nothing beyond arrival can be asserted.

### COND-LOGIN-FORM-015: Inputs carry accessible labels

| Field      | Value                 |
| ---------- | --------------------- |
| ID         | COND-LOGIN-FORM-015   |
| Priority   | Low                   |
| Category   | State                 |
| Technique  | Exploratory heuristic |
| Source     | REQ-LOGIN-050         |
| Test cases | LOGIN-FORM-015        |

**What to cover**
Both inputs expose an accessible name, so they are addressable by role and label rather than by CSS.

**Values / boundaries**

```
textbox "UserName" resolves; textbox "Password" resolves
```

**Notes**
Low priority: this is not a user-facing behavior so much as the precondition that lets every other condition here use `getByRole`. If it regressed, the other tests would fail first and more loudly. Retained because it is the one accessibility property the form does satisfy, and its loss would force the whole suite onto CSS selectors.

---

## Infeasible conditions

### COND-LOGIN-FORM-INF-001: Accessible signal for a blocked submission (infeasible)

| Field      | Value                                                    |
| ---------- | -------------------------------------------------------- |
| ID         | COND-LOGIN-FORM-INF-001                                  |
| Priority   | Medium — would matter if accessibility ever enters scope |
| Category   | Input field                                              |
| Technique  | EP                                                       |
| Source     | REQ-LOGIN-013, DIVERGENCE-1                              |
| Test cases | —                                                        |

**What to cover**
A field blocked from submission exposes a programmatically determinable invalid state — `aria-invalid`, an associated message, or an accessibility-tree entry.

**Why infeasible**
No such signal exists. The only indication is the `is-invalid` CSS class; there is no message text, no ARIA state, and no accessibility-tree entry. Accessibility testing is also excluded by `docs/test-plan.md` §2, and disposition DIVERGENCE-1 (`Defect — do not automate`) instructs that no condition be derived.

**Mitigation**
COND-LOGIN-FORM-001/002/003 assert the `is-invalid` class instead, which is the only available oracle. The accessibility gap is recorded as a defect in the SUT rather than tested for.

### COND-LOGIN-FORM-INF-002: Password complexity enforced at login (infeasible)

| Field      | Value                       |
| ---------- | --------------------------- |
| ID         | COND-LOGIN-FORM-INF-002     |
| Priority   | Low                         |
| Category   | Input field                 |
| Technique  | EP                          |
| Source     | REQ-LOGIN-020, DIVERGENCE-3 |
| Test cases | —                           |

**What to cover**
The complexity `pattern` declared on the password field is applied, blocking a weak password before submission.

**Why infeasible**
The attribute is decorative — the browser marks the field invalid but the form submits regardless. Enforcing it would be wrong behavior anyway: an account whose password predates the rule could never sign in. Disposition DIVERGENCE-3 is `Defect — do not automate`.

**Mitigation**
REQ-LOGIN-020's correct behavior — any non-blank pair is submitted — is already covered by COND-LOGIN-FORM-004 through -006 and -008/-009. Recorded chiefly as a trap: the DOM advertises a rule the form does not apply, and a condition written from the attribute would fail.

### COND-LOGIN-FORM-INF-003: Duplicate submissions are prevented (infeasible)

| Field      | Value                       |
| ---------- | --------------------------- |
| ID         | COND-LOGIN-FORM-INF-003     |
| Priority   | Low                         |
| Category   | Behavior                    |
| Technique  | Exploratory heuristic       |
| Source     | REQ-LOGIN-041, DIVERGENCE-5 |
| Test cases | —                           |

**What to cover**
Rapid repeat clicks on Login issue only one authentication request while one is in flight.

**Why infeasible**
No guard exists — three rapid clicks produced three requests, and the button is never disabled. Disposition DIVERGENCE-5 is `Defect — do not automate`: authentication is idempotent here, so the user-visible outcome is unchanged and a permanently failing test would not earn its place.

**Mitigation**
Recorded as a usability and load defect. Revisit if the form gains an in-flight state.

### COND-LOGIN-FORM-INF-004: Authentication failure signalled at transport level (infeasible)

| Field      | Value                       |
| ---------- | --------------------------- |
| ID         | COND-LOGIN-FORM-INF-004     |
| Priority   | Low                         |
| Category   | Behavior                    |
| Technique  | Decision table              |
| Source     | REQ-LOGIN-035, DIVERGENCE-4 |
| Test cases | —                           |

**What to cover**
A rejected credential pair produces a non-2xx HTTP status, so failure is detectable at the transport level.

**Why infeasible**
`POST /Account/v1/GenerateToken` returns HTTP 200 with `status: "Failed"` in the body. This is API behavior, not form behavior — disposition DIVERGENCE-4 is `Accept as-is`, and the endpoint is already covered by `docs/api-spec/account-endpoints.md` and the API test suite.

**Mitigation**
The form consumes the body correctly and renders the error, which COND-LOGIN-FORM-008/009 assert. Retained here as an implementation constraint: any UI test that inspects network traffic must assert on the response body, never the status code.

---

## Coverage completeness check

| Question                                                                                      | Answer                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Does every required input field have a valid EP condition?                                    | Yes — COND-LOGIN-FORM-007 covers both fields with valid values                                                           |
| Does every required input field have at least one invalid EP condition?                       | Yes — COND-LOGIN-FORM-001 (username), -002 (password)                                                                    |
| Are all BVA boundaries covered (min, min-1, empty)?                                           | Partly — empty (-003) and just-above-empty (-004) are covered; no maximum exists to bound (see gaps)                     |
| Does every authorization state produce a distinct condition?                                  | Not applicable — the form has no authorization states; the session state it does have is COND-LOGIN-FORM-013             |
| Are all infeasible conditions documented?                                                     | Yes — INF-001 to INF-004, one per divergence disposition instructing no condition                                        |
| Does every analysis bullet map to at least one condition?                                     | Yes                                                                                                                      |
| Does every requirement in the test basis map to a condition or a documented infeasible entry? | Yes — all 22 requirements accounted for, verified by cross-checking every REQ-LOGIN-NNN id against the requirements file |
| Are all conditions independently testable?                                                    | Yes — each starts from a signed-out context and seeds its own account where one is needed                                |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)?        | No — see the note on -008/-009 below                                                                                     |

**Coverage gaps identified**

- **No maximum-length boundary exists** — closed 2026-09-10. The endpoint was probed at 1 / 100 / 1,000 / 5,000 / 10,000 and 50,000 characters and rejected all identically, so there is no limit to bound. COND-LOGIN-FORM-005 covers the "very long input" equivalence class instead; this is a property of the SUT, not a missing test.
- **Keyboard submission** — closed 2026-09-10. Re-verified with a real keypress; COND-LOGIN-FORM-012's basis is now `high` confidence.
- **The success path depends on a seeded account** (COND-LOGIN-FORM-007), so it inherits Risk-1 — every run creates and deletes a real user on the shared backend. Open by design, not a gap to close.

**Deferred conditions**

- Accessibility of the blocked-submission signal — deferred indefinitely; out of scope per `docs/test-plan.md` §2 (COND-LOGIN-FORM-INF-001).
- Whether the authentication error is _announced_ by assistive technology — same scope exclusion; COND-LOGIN-FORM-016 covers discoverability only.

**Note on COND-LOGIN-FORM-008 / -009.** These are not a trigger/effect pair. Each asserts a distinct input class — unknown username vs. wrong password for a real account — and each is independently testable. They are also jointly necessary: the non-disclosure property in REQ-LOGIN-031 is only observable by comparing their messages, which is why -009's expected result names -008 explicitly rather than restating the string.
