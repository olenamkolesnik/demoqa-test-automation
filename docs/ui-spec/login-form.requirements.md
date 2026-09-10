# Login Form — Feature Requirements

**Feature:** the login form on `https://demoqa.com/login` — username field, password field, Login button, New User button, and the messages the form renders.

**Scope.** All requirements for testing the login form: its inputs, its validation, its submission outcomes (both success and failure), and the states it presents. Out of scope: the registration form's own rules, the profile page's contents, and the wider session lifecycle beyond the point at which this form hands off.

**Test level.** System-level, black-box, per `docs/test-plan.md` §4 — the form is exercised through a real browser against the live application, not in isolation with mocked dependencies. "Feature" here means a scoped slice of the UI, not an ISTQB component-testing (unit) level.

**Status.** This document is a **test basis**: it states what the login form is required to do. Test conditions (equivalence classes, boundaries, priority) and test cases are derived from it downstream — they are deliberately not present here.

**Test basis.** DemoQA publishes no specification, so observed behavior is the only authority. Every requirement below was derived from live observation via Playwright MCP (Chromium, desktop viewport) on 2026-09-07 → 2026-09-10. Where an observation needed a registered account, a `qa_`-prefixed user was created and deleted via the `/Account` API in the same pass (Risk-1, `docs/test-plan.md` §8).

**Source labels**

- `observed` — directly triggered through the live form and seen. Reading a label or DOM attribute is **not** observing behavior.
- `inferred` — implied by observed behavior or DOM attributes, without being directly triggered.
- `assumed` — a standard login-form expectation applied where DemoQA gives no evidence either way. **Requires human confirmation before automation.**

**DIVERGENCE** marks a requirement whose _intended_ behavior is contradicted by what the form actually does. The Statement says what the form should do; the note records reality, and a **Disposition** states what test design should do about it. **These must never be silently automated as-is** — a test asserting the observed side would encode a defect as expected behavior.

---

## Requirements

### Successful submission

| ID            | Statement                                                                                                             | Source   | Confidence | Evidence                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-LOGIN-001 | The form shall accept a username and password matching a registered account, and hand off to the authenticated area.  | observed | high       | Submitted valid credentials for a seeded `qa_` account (2026-09-10). URL changed `/login` → `/profile` in ~1.7s; the login form was no longer present; no error message rendered.                     |
| REQ-LOGIN-002 | The form shall not render an error when submission succeeds.                                                          | observed | high       | On the successful submission above, `p#name` was absent throughout (2026-09-10).                                                                                                                      |
| REQ-LOGIN-003 | The form shall present a signed-out entry point only to users without an active session, and not offer sign-in twice. | observed | high       | Navigating to `/login` with an active session (2026-09-10) replaces the form entirely with `button "Log out"` and the text "You are already logged in. View your profile." with a link to `/profile`. |

### Required-field validation

| ID            | Statement                                                                                                                                                                                               | Source   | Confidence | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REQ-LOGIN-010 | The form shall require a value in the username field before attempting authentication.                                                                                                                  | observed | high       | Submitted with username blank, password filled (2026-09-08). No network request issued; `#userName` received the `is-invalid` class. The input carries `required` in the DOM.                                                                                                                                                                                                                                                                    |
| REQ-LOGIN-011 | The form shall require a value in the password field before attempting authentication.                                                                                                                  | observed | high       | Submitted with password blank, username filled (2026-09-08). No network request issued; `#password` received the `is-invalid` class. The input carries `required` in the DOM.                                                                                                                                                                                                                                                                    |
| REQ-LOGIN-012 | The form shall indicate which specific field is missing, rather than marking the form as a whole.                                                                                                       | observed | high       | All four blank/filled combinations submitted (2026-09-08). Only the empty field receives `is-invalid`; a filled field stays clean. Both blank → both marked.                                                                                                                                                                                                                                                                                     |
| REQ-LOGIN-013 | The form shall expose a programmatically determinable invalid state on a field whose absence blocked submission — an `aria-invalid` state, an associated error message, or an accessibility-tree entry. | observed | high       | **See DIVERGENCE-1.** The only signal is the `is-invalid` CSS class (red border): no message text, no `aria-invalid`, no `aria-required`, no accessibility-tree entry, no `role="alert"`.                                                                                                                                                                                                                                                        |
| REQ-LOGIN-014 | The form shall perform required-field checks client-side, without a server round trip.                                                                                                                  | observed | high       | Zero requests to `/Account/v1/GenerateToken` for any blank-field submission (2026-09-08, re-confirmed 2026-09-10).                                                                                                                                                                                                                                                                                                                               |
| REQ-LOGIN-015 | The form shall treat any non-empty string, including whitespace-only input, as a value and submit it for server validation.                                                                             | observed | high       | Submitted `"   "` in both fields (2026-09-10): the `required` check passed, no `is-invalid` appeared, and the credentials were sent to the server, which rejected them generically. A single character (`"a"` / `"b"`) behaves identically (2026-09-10), placing the required-check boundary exactly between 0 and 1 characters. Reworded per DIVERGENCE-2 (accepted 2026-09-10); empty and whitespace-only remain distinct equivalence classes. |

### Input handling

| ID            | Statement                                                                                                 | Source   | Confidence | Evidence                                                                                                                                                                                                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-LOGIN-020 | The form shall submit any non-blank credential pair to the server, without imposing its own format rules. | observed | high       | Submitted `password="weak"` against the field's own declared `pattern` (2026-09-09): `checkValidity()` returned `false`, yet the form submitted and the server responded.                                                                                                                                                                                                   |
| REQ-LOGIN-022 | The form shall accept credential input of any length without truncating it or failing.                    | observed | high       | Submitted 10,000 characters in both fields (2026-09-10): value retained intact before and after submit; request sent; standard rejection returned; no client error. Neither input declares `maxlength`. Probing the same endpoint at 1 / 100 / 1,000 / 5,000 / 10,000 / 50,000 characters returned the identical rejection every time — **no upper limit exists to bound**. |
| REQ-LOGIN-023 | The form shall accept special characters in credentials and transmit them without corruption.             | observed | high       | Submitted `<script>'"&;--` as username and `!@#$%^&*()_+{}\|:"<>?` as password (2026-09-10). Request body carried both verbatim, correctly JSON-encoded; standard rejection; no client-side error or sanitisation.                                                                                                                                                          |
| REQ-LOGIN-024 | The form shall keep the password masked at all times, including after a failed attempt.                   | observed | high       | `#password` remains `type="password"` after failed submissions (2026-09-10). No visibility-toggle control exists on this form.                                                                                                                                                                                                                                              |

### Rejected credentials

| ID            | Statement                                                                                                                | Source   | Confidence | Evidence                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-LOGIN-030 | The form shall reject credentials not matching a registered account, and keep the user on the form.                      | observed | high       | Submitted a non-existent username, and a wrong password for a real seeded account (2026-09-08). Both produce `p#name` → "Invalid username or password!"; URL unchanged.                                                          |
| REQ-LOGIN-031 | The form shall not reveal whether a failed attempt was due to an unknown username or an incorrect password.              | observed | high       | Both failure modes produce the byte-identical string "Invalid username or password!", with no difference in status, body, or observed timing (2026-09-08). Prevents username enumeration.                                        |
| REQ-LOGIN-032 | The form shall render the authentication error where it is programmatically discoverable.                                | observed | medium     | Error renders in `p#name` above the form controls and **is** exposed in the accessibility tree as `paragraph`. Discoverable but not announced — no `role="alert"` or live region observed.                                       |
| REQ-LOGIN-033 | The form shall clear any field-level invalid marking once a submission reaches the server.                               | observed | high       | After a filled-but-wrong submission, both inputs' `is-invalid` classes are absent while the error is displayed (2026-09-08). Blank-field marking and server-error messaging are mutually exclusive.                              |
| REQ-LOGIN-034 | The form shall preserve the user's entered values after a failed attempt, so input can be corrected rather than retyped. | observed | high       | After a rejected submission both fields retained their submitted values (2026-09-10).                                                                                                                                            |
| REQ-LOGIN-035 | The form shall present a failed authentication as a failure at the transport level as well as in the interface.          | observed | high       | **See DIVERGENCE-4.** `POST /Account/v1/GenerateToken` returns **HTTP 200** for rejected credentials, with failure carried in the body: `{"token":null,"expires":null,"status":"Failed","result":"User authorization failed."}`. |

### Submission control and abuse resistance

| ID            | Statement                                                                                | Source   | Confidence | Evidence                                                                                                                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-LOGIN-040 | The form shall support submission by keyboard, without requiring a pointer.              | observed | high       | With both fields filled and focus in the password field, a genuine `keyboard.press('Enter')` submitted the form and produced the standard rejection message (2026-09-10). Upgraded from `medium` to `high` — an earlier run used synthetic key events; this one used a real keypress and matched. |
| REQ-LOGIN-041 | The form shall prevent duplicate authentication requests while one is already in flight. | observed | high       | **See DIVERGENCE-5.** Three rapid clicks on the Login button issued **three** separate `POST /Account/v1/GenerateToken` requests (2026-09-10). The button's `disabled` property was `false` after each click.                                                                                     |

### Structure and navigation

| ID            | Statement                                                               | Source   | Confidence | Evidence                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-LOGIN-050 | The form shall provide an accessible label for each input.              | observed | high       | Accessibility snapshot resolves `textbox "UserName"` and `textbox "Password"` (2026-09-08). Visible labels read `UserName :` / `Password :`; the accessible name omits the colon. |
| REQ-LOGIN-051 | The form shall offer a user without an account a route to registration. | observed | high       | `button "New User"` (`#newUser`) navigates to `/register` (2026-09-09).                                                                                                           |

---

## Divergences

Each records observed behavior contradicting the requirement it names.

**Every divergence carries a Disposition**, because a requirement contradicted by reality is ambiguous as a test basis: without a decision, a test designer cannot tell whether to assert the requirement (and fail) or the observed behavior (and enshrine a defect). The three dispositions are:

| Disposition                      | Meaning for test design                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Accept as-is**                 | The SUT behavior is acceptable; the requirement as originally worded was wrong. Derive conditions from the observed behavior.                    |
| **Defect — do not automate**     | Genuine defect, but not worth a permanently failing test. Record it; derive no condition. Revisit if the SUT changes.                            |
| **Defect — automate as failing** | Genuine defect worth a standing marker. The test asserts the requirement and is expected to fail until fixed. Use sparingly — red CI has a cost. |

**All six dispositions were reviewed and accepted on 2026-09-10.** Two changed the requirement set: DIVERGENCE-2 reworded REQ-LOGIN-015, and DIVERGENCE-6 removed the rate-limiting requirement, which is now recorded as a property of the SUT rather than something it is required to do. The remaining four stand as instructions to test design and must be honoured when conditions are derived.

**DIVERGENCE-1 — blank-field rejection has no accessible signal (REQ-LOGIN-013).**
The sole indication is the `is-invalid` class producing a red border: no text, no ARIA state, nothing in the accessibility tree. A screen-reader user gets no indication of why submission failed. This is an accessibility defect in the SUT. It also forces any test of REQ-LOGIN-010/011/012 onto a raw CSS selector — the last resort in `docs/coding-standards.md`'s locator priority, justified here because no accessible alternative exists, and requiring a comment saying so.

**Disposition — Defect, do not automate.** A real accessibility defect, but the project scope excludes accessibility testing (`docs/test-plan.md` §2). Derive conditions for REQ-LOGIN-010/011/012 from the `is-invalid` class, which is the only signal available; do not derive a condition asserting an accessible signal that does not exist.

**DIVERGENCE-2 — whitespace-only input is treated as a value (REQ-LOGIN-015).**
`"   "` satisfies the `required` check, so the form issues a real authentication request for input that cannot identify an account. Minor, but "empty" and "whitespace" are two distinct input classes with two different behaviors — separate them deliberately at test-design time rather than conflating them.

**Disposition — Accept as-is.** Trimming input before a required check is a nicety, not a correctness rule, and the server rejects the credentials anyway. Reword the requirement to match reality: _the form shall treat any non-empty string, including whitespace, as a value and submit it for server validation_. Empty and whitespace-only remain two distinct equivalence classes for test conditions.

**DIVERGENCE-3 — the password field declares a complexity rule it never enforces (REQ-LOGIN-020).**
`#password` carries the registration complexity `pattern` on the _login_ form, where it does not belong. The browser marks the field invalid; the application submits regardless. The attribute is decorative — it neither blocks submission nor surfaces a message. Anyone reading the DOM would reasonably infer client-side enforcement and write a test that fails.

**Disposition — Defect, do not automate.** Enforcing registration complexity at login would be wrong behavior anyway (an existing account whose password predates the rule could never sign in), so the fix is to remove the attribute, not to enforce it. No condition either way; REQ-LOGIN-020 already covers the correct behavior — that any non-blank pair is submitted. Recorded chiefly as a trap: the DOM advertises a rule the form does not apply.

**DIVERGENCE-4 — authentication failure returns HTTP 200 (REQ-LOGIN-035).**
`POST /Account/v1/GenerateToken` answers rejected credentials with status 200 and `status: "Failed"` in the body. **A test cannot detect login failure by HTTP status**; any network-level assertion must read the response body. The UI handles this correctly — it reads the body and renders the error — so the divergence is in the API contract, not the form.

**Disposition — Accept as-is.** Out of scope for this document: the behavior belongs to the `/Account` API, already covered by `docs/api-spec/account-endpoints.md`, and the form consumes it correctly. Retained here purely as an implementation constraint — any test that inspects the network must assert on the body, never the status.

**DIVERGENCE-5 — no duplicate-submission guard (REQ-LOGIN-041).**
Three rapid clicks produced three authentication requests; the button is never disabled and no in-flight state exists. On a slow connection a user double-clicking generates redundant server load, and the last response wins non-deterministically. No progress indication of any kind was observed during the ~1.1–1.7s round trip, which makes double-clicking the natural user response.

**Disposition — Defect, do not automate.** A genuine usability and load defect worth recording, but with authentication being idempotent here the user-visible outcome is unchanged, and a permanently failing test would not earn its place. Revisit if the form gains an in-flight state.

**DIVERGENCE-6 — no rate limiting or lockout (recorded property; no requirement).**
Six consecutive failures for one username produced no lockout, no CAPTCHA, no delay. Unlimited credential guessing is possible. Deliberately observed at low volume (6 attempts) and not pursued further: functional observation, not exploitation.

**Disposition — Accept as-is.** Expected for a public demo sandbox, and security penetration testing is explicitly out of scope (`docs/test-plan.md` §2). Delete REQ-LOGIN-042 as a requirement of this SUT and keep this note as a recorded property. No lockout behavior exists, so no condition can be derived — and repeated-failure conditions must stay at low volume for the same Risk-1 reason.

---

## Human review gate

- [ ] **No `observed` requirement encodes current behavior as the oracle.** Six candidates are isolated as DIVERGENCE-1 to -6 rather than written as intended behavior.
- [x] **Each divergence's Disposition is signed off** (2026-09-10). Three `Accept as-is` (2, 4, 6) and three `Defect — do not automate` (1, 3, 5); none carries a standing failing test. The two that changed the requirement set have been applied.
- [ ] **No `assumed` requirement remains.** All requirements are now `observed` or `inferred`. Two earlier `assumed` items (in-progress indication, duplicate-submission guard) were resolved: one by observation (REQ-LOGIN-041), one by deletion — a requirement with no evidence is not a requirement.
- [ ] **Requirements are testable statements, not implementation detail.** Each Statement names component behavior; DOM specifics (`is-invalid`, `p#name`, `#newUser`) appear only in Evidence and Divergences.

**Reviewer notes.** REQ-LOGIN-032 is the only remaining `medium`-confidence requirement: the error message is exposed in the accessibility tree, but no `role="alert"` or live region was checked, so whether it is _announced_ is unconfirmed. Not blocking — announcement is an accessibility concern, excluded from scope by `docs/test-plan.md` §2. REQ-LOGIN-040 was raised to `high` on 2026-09-10 after re-verification with a real keypress.

**Requirements removed during review** (2026-09-10), recorded so the omissions are visible rather than silent:

- _The form shall not declare input constraints it does not enforce_ — a meta-statement about DOM/behavior consistency, not observable form behavior. The finding it rested on survives as DIVERGENCE-3.
- _The form shall not retain credentials in browser autofill storage_ — testable only by asserting `autocomplete="off"` exists, which tests the implementation rather than the behavior.
- _The form shall indicate that a submission is in progress_ — `assumed` with no supporting evidence. The user-facing consequence survives in DIVERGENCE-5.

---

## Constraint on test design — session isolation

**Every test of this form must start from a signed-out browser context.** This is not a preference; it follows from REQ-LOGIN-003 combined with how the session is stored.

The session lives in React in-memory state only — nothing in `localStorage`, `sessionStorage`, `indexedDB`, or cookies (verified 2026-09-07). Two consequences follow:

- **A signed-in context hides the form entirely.** Navigating to `/login` with an active session replaces the username/password/Login controls with a `Log out` button and an "already logged in" message. A test that assumes the form is present will fail at the first locator, with an error that points at the locator rather than at the real cause — a leaked session from an earlier action in the same context.
- **The session cannot be seeded or cleared through storage.** There is no key to write or delete. A signed-out state is obtained only by using a fresh browser context, or by driving the `Log out` control.

This interacts directly with `fullyParallel: true` and with the project's independence rule (`docs/test-plan.md` §4: _"no test depends on execution order"_). Any fixture that establishes a signed-in state for one test must not hand that context to another. It also means an API-seeded account gets a test as far as _having credentials_, never as far as _being signed in_ — the form itself is the only route to a session.

---

## Element reference

Supporting detail for implementation. Not requirements.

| Element                 | Role + accessible name                      | Fallback id   | Notes                                                                                                                            |
| ----------------------- | ------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Username field          | `textbox "UserName"`                        | `#userName`   | `type=text`, `required`, `placeholder="UserName"`, `autocomplete="off"`, no `maxlength`, no `pattern`                            |
| Password field          | `textbox "Password"`                        | `#password`   | `type=password`, `required`, `autocomplete="off"`, no `maxlength`; carries an unenforced complexity `pattern` — see DIVERGENCE-3 |
| Login button            | `button "Login"`                            | `#login`      | Use `exact: true` — the left nav also contains `link "Login"`                                                                    |
| New User button         | `button "New User"`                         | `#newUser`    | → `/register`                                                                                                                    |
| Error message           | `paragraph` "Invalid username or password!" | `#name`       | Present only after a rejected credential pair                                                                                    |
| Invalid marking         | _(no accessible equivalent)_                | `.is-invalid` | CSS class on the offending input — the only signal for blank-field rejection; see DIVERGENCE-1                                   |
| Already-signed-in state | `button "Log out"` + link `profile`         | —             | Replaces the whole form when a session is active — see REQ-LOGIN-003                                                             |

Every in-scope element except the blank-field marking has an accessible role and name, so `getByRole` satisfies the first tier of `docs/coding-standards.md`'s locator priority; **`testIdAttribute` is not needed** and has deliberately not been configured.

Other observations: the page title is `demosite` on every page, so it can never serve as a navigation assertion. Advertisement iframes load after first paint beside and below the form; no click interception on Login or New User was seen at desktop viewport. The form is React-rendered and not present at `domcontentloaded`, so auto-retrying assertions are required — a fixed wait is not.

---

## Provenance log

| Date       | What was verified                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-07 | Session is held in React memory only — nothing in localStorage, sessionStorage, IndexedDB, or cookies                                                                                                                                                                                                                                                             |
| 2026-09-08 | Blank-field behavior across all four combinations; client-side-only validation; error message text and host element; identical failure modes for unknown user vs. wrong password; accessible names                                                                                                                                                                |
| 2026-09-09 | Field DOM attributes (`required`, `pattern`, `autocomplete`, no `maxlength`); unenforced password `pattern`; `New User` → `/register`                                                                                                                                                                                                                             |
| 2026-09-10 | Successful submission and hand-off to `/profile`; already-signed-in form state; whitespace-only input; special characters transmitted verbatim; value retention after failure; password masking; duplicate-submission (3 clicks → 3 requests); six-attempt rate-limit observation; HTTP 200 on authentication failure                                             |
| 2026-09-10 | _Gap-closing pass:_ Enter-key submission re-verified with a real `keyboard.press` (REQ-LOGIN-040 → `high`); input length probed at 1 / 100 / 1,000 / 5,000 / 10,000 / 50,000 characters with no limit found, and 10,000 characters confirmed intact through the form (REQ-LOGIN-022); single-character input confirmed to pass the required check (REQ-LOGIN-015) |
