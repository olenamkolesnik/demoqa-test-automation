# Registration Form — Feature Requirements

**Feature:** the registration form on `https://demoqa.com/register` — First Name field, Last Name field, UserName field, Password field, Register button, Back to Login button, the reCAPTCHA widget, and the messages the form renders.

**Scope.** All requirements for testing the registration form: its inputs, its validation, its submission outcomes (both success and failure), and the states it presents. Out of scope: the login form's own rules (covered by `docs/ui-spec/login-form.requirements.md`), the profile page's contents, and what the created account can subsequently do.

**Test level.** System-level, black-box, per `docs/test-plan.md` §4 — the form is exercised through a real browser against the live application, not in isolation with mocked dependencies. "Feature" here means a scoped slice of the UI, not an ISTQB component-testing (unit) level.

**Status.** This document is a **test basis**: it states what the registration form is required to do. Test conditions (equivalence classes, boundaries, priority) and test cases are derived from it downstream — they are deliberately not present here.

**Test basis.** DemoQA publishes no specification, so observed behavior is the only authority. Every requirement below was derived from live observation via Playwright MCP (Chromium, desktop viewport) on 2026-09-14. Accounts created during observation were `qa_`-prefixed and deleted via the `/Account` API in the same pass (Risk-1, `docs/test-plan.md` §8); one orphan is recorded in the provenance log.

**Source labels**

- `observed` — directly triggered through the live form and seen. Reading a label or DOM attribute is **not** observing behavior.
- `inferred` — implied by observed behavior or DOM attributes, without being directly triggered.
- `assumed` — a standard registration-form expectation applied where DemoQA gives no evidence either way. **Requires human confirmation before automation.**

**DIVERGENCE** marks a requirement whose _intended_ behavior is contradicted by what the form actually does. The Statement says what the form should do; the note records reality, and a **Disposition** states what test design should do about it. **These must never be silently automated as-is** — a test asserting the observed side would encode a defect as expected behavior.

---

## Requirements

### Successful submission

| ID          | Statement                                                                                              | Source   | Confidence | Evidence                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-REG-001 | The form shall create an account from a valid first name, last name, username, and password.           | observed | high       | Submitted a complete `qa_`-prefixed set (2026-09-14). `POST /Account/v1/User` → **201** with `{"userID":"…","username":"…","books":[]}`; the account was afterwards able to authenticate via `/Account/v1/Login`. |
| REQ-REG-002 | The form shall confirm a successful registration to the user.                                          | observed | high       | A native browser `alert` with the exact text **"User Registered Successfully."** is raised on 201 (2026-09-14, reproduced across three separate registrations). No in-page message accompanies it.                |
| REQ-REG-003 | The form shall clear its inputs after a successful registration, so the form is not resubmitted as-is. | observed | high       | All four fields read `""` immediately after the success alert (2026-09-14). Contrast REQ-REG-032: values are retained after a _failed_ attempt.                                                                   |
| REQ-REG-004 | The form shall keep the user on the registration page after registering, rather than signing them in.  | observed | high       | URL remained `/register` after a 201 (2026-09-14). No session is established — reaching `/profile` afterwards still required signing in through the login form.                                                   |

### Required-field validation

| ID          | Statement                                                                                                                                                                                               | Source   | Confidence | Evidence                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-REG-010 | The form shall require a value in every one of its four fields before attempting registration.                                                                                                          | observed | high       | Submitting entirely blank marks all four inputs with `is-invalid` and issues no network request (2026-09-14). All four inputs carry `required` in the DOM.                                                                                                                      |
| REQ-REG-011 | The form shall indicate which specific fields are missing, rather than marking the form as a whole.                                                                                                     | observed | high       | Partial-fill combinations submitted from fresh page loads (2026-09-14): only the empty fields receive `is-invalid`; filled fields stay clean. First-name-only → the other three marked; password-only → the other three marked; all-but-password → only password marked.        |
| REQ-REG-012 | The form shall expose a programmatically determinable invalid state on a field whose absence blocked submission — an `aria-invalid` state, an associated error message, or an accessibility-tree entry. | observed | high       | **See DIVERGENCE-1.** The only signal is the `is-invalid` CSS class (red border): no message text, no `aria-invalid`, no accessibility-tree entry, no `role="alert"`.                                                                                                           |
| REQ-REG-013 | The form shall perform required-field checks client-side, without a server round trip.                                                                                                                  | observed | high       | Zero requests to `/Account/v1/User` for any blank-field submission (2026-09-14).                                                                                                                                                                                                |
| REQ-REG-014 | The form shall treat any non-empty string, including whitespace-only input, as a value and submit it for server validation.                                                                             | observed | high       | Submitted `"   "` in all four fields (2026-09-14): the `required` check passed, no `is-invalid` appeared, and `{"userName":"   ","password":"   "}` was sent. The server rejected it on the password rule, not the username. Empty and whitespace-only remain distinct classes. |

### Input handling

| ID          | Statement                                                                                          | Source   | Confidence | Evidence                                                                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-REG-020 | The form shall submit the entered credentials to the server without imposing its own format rules. | observed | high       | **See DIVERGENCE-2.** `#password` declares a complexity `pattern`; `checkValidity()` returned `false` for `"weak"`, yet the form submitted it and the server responded with the rejection. The attribute blocks nothing and surfaces no message.            |
| REQ-REG-021 | The form shall accept input of any length without truncating it.                                   | inferred | medium     | No input declares `maxlength` or `minlength` (`maxLength`/`minLength` both `-1`, 2026-09-14). Not probed at length on this form — the equivalent probe on the login form found no upper bound (REQ-LOGIN-022), and both feed the same `/Account` endpoints. |
| REQ-REG-022 | The form shall keep the password masked at all times, including after a failed attempt.            | observed | high       | `#password` is `type="password"` and remains so after failed submissions (2026-09-14). No visibility-toggle control exists on this form.                                                                                                                    |

### Rejected submissions

| ID          | Statement                                                                                                                | Source   | Confidence | Evidence                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-REG-030 | The form shall reject a password not meeting the complexity rule, and explain why.                                       | observed | high       | Submitted `"weak"` (2026-09-14): `POST /Account/v1/User` → **400**, `{"code":"1300","message":"Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer."}`. The message renders in-page in `p#name`, red. |
| REQ-REG-031 | The form shall reject a username that is already registered, and tell the user that is why.                              | observed | high       | **See DIVERGENCE-3.** Re-submitting an existing username returns **406** `{"code":"1204","message":"User exists!"}`, but **nothing is shown to the user** — no alert, no in-page text, no field marking. Reproduced on two separate accounts, twice each (2026-09-14).                                                                                      |
| REQ-REG-032 | The form shall preserve the user's entered values after a failed attempt, so input can be corrected rather than retyped. | observed | high       | After both the 400 (weak password) and the 406 (duplicate username), all four fields retained their submitted values (2026-09-14). Contrast REQ-REG-003, where a success clears them.                                                                                                                                                                       |
| REQ-REG-033 | The form shall render a submission error where it is programmatically discoverable.                                      | observed | medium     | The password-rule error renders in `p#name` (class `mb-1`, `color: rgb(255, 0, 0)`) and is present in the DOM as a paragraph. Whether it is _announced_ was not checked — no `role="alert"` or live region observed. Applies only to errors that render at all; see DIVERGENCE-3.                                                                           |

### Bot protection

| ID          | Statement                                                                                | Source   | Confidence | Evidence                                                                                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-REG-040 | The form shall be protected against automated submission.                                | observed | high       | A reCAPTCHA v2 widget is present (`iframe[title="reCAPTCHA"]`, 256×60, sitekey `6LfupSksAAAAALHNQnHsBoy3J8S7I79ujAhpQJwy`) with a `textarea[name="g-recaptcha-response"]` in the DOM (2026-09-14).                                                          |
| REQ-REG-041 | The form shall tell the user when a submission was blocked rather than failing silently. | observed | high       | **See DIVERGENCE-4.** Some submissions produce **no network request and no message of any kind** — the click appears to do nothing. Measured 1 silent no-op in 5 consecutive trials (2026-09-14), consistently the first submission after a cold page load. |

### Structure and navigation

| ID          | Statement                                                                          | Source   | Confidence | Evidence                                                                                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REQ-REG-050 | The form shall provide an accessible label for each input.                         | observed | high       | Accessibility snapshot resolves `textbox "First Name"`, `textbox "Last Name"`, `textbox "UserName"`, `textbox "Password"`, each matching exactly one element (2026-09-14). Visible labels carry a trailing ` :` the accessible name omits. |
| REQ-REG-051 | The form shall offer a user who already has an account a route back to signing in. | observed | high       | `button "Back to Login"` (`#gotologin`) navigates to `/login` (2026-09-14).                                                                                                                                                                |
| REQ-REG-052 | The form shall support submission by keyboard, without requiring a pointer.        | observed | high       | With all four fields filled and focus in the password field, a real `keyboard.press('Enter')` submitted the form and produced the success alert and a 201 (2026-09-14).                                                                    |
| REQ-REG-053 | The form shall remain available to a signed-in user rather than being replaced.    | observed | high       | Visiting `/register` with an active session leaves the form fully present (`#register`, `#firstname` both in the DOM) with no "already logged in" substitution (2026-09-14). **This differs from the login form** — see REQ-LOGIN-003.     |

---

## Divergences

Each records observed behavior contradicting the requirement it names.

**Every divergence carries a Disposition**, because a requirement contradicted by reality is ambiguous as a test basis: without a decision, a test designer cannot tell whether to assert the requirement (and fail) or the observed behavior (and enshrine a defect). The three dispositions are:

| Disposition                      | Meaning for test design                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Accept as-is**                 | The SUT behavior is acceptable; the requirement as originally worded was wrong. Derive conditions from the observed behavior.                    |
| **Defect — do not automate**     | Genuine defect, but not worth a permanently failing test. Record it; derive no condition. Revisit if the SUT changes.                            |
| **Defect — automate as failing** | Genuine defect worth a standing marker. The test asserts the requirement and is expected to fail until fixed. Use sparingly — red CI has a cost. |

**DIVERGENCE-1 — blank-field rejection has no accessible signal (REQ-REG-012).**
Identical in kind to the login form's DIVERGENCE-1. The sole indication is the `is-invalid` class producing a red border: no text, no ARIA state, nothing in the accessibility tree. A screen-reader user gets no indication of why submission failed. It also forces any test of REQ-REG-010/011 onto a raw CSS class — the last resort in `docs/coding-standards.md`'s locator priority, justified here because no accessible alternative exists, and requiring a comment saying so.

**Disposition — Defect, do not automate.** A real accessibility defect, but the project scope excludes accessibility testing (`docs/test-plan.md` §2). Derive conditions for REQ-REG-010/011 from the `is-invalid` class, which is the only signal available; do not derive a condition asserting an accessible signal that does not exist.

**DIVERGENCE-2 — the password field declares a complexity rule the form never enforces (REQ-REG-020).**
`#password` carries `pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})$"`. The browser marks the field invalid (`checkValidity()` → `false`), but the form submits anyway and lets the server reject it. Unlike the login form, where the same attribute is wholly decorative, here the rule it describes **is** real — it is simply enforced server-side only, and the client-side attribute contributes nothing but a misleading DOM signal.

**Disposition — Accept as-is.** The user-visible outcome is correct: a weak password is rejected with a clear, specific message (REQ-REG-030). Deriving a condition that asserts client-side blocking would be asserting behavior the form does not have. Derive conditions from the observed path — submit, get the server's 400, see the message. Recorded chiefly as a trap: the DOM advertises client-side enforcement that does not exist.

**DIVERGENCE-3 — a duplicate username fails completely silently (REQ-REG-031).**
The server correctly answers **406** with `{"code":"1204","message":"User exists!"}`, and the form does nothing with it: no alert, no `p#name` text, no field marking, no clearing, no navigation. The user clicks Register, the form appears unchanged, and they have no way to distinguish this from "nothing happened." Reproduced four times across two accounts. This is the most serious defect on the form — the failure mode most likely to be hit by a real user (choosing a taken name) is the one with no feedback at all. It is also a stark inconsistency: the password error (400) renders fine through the very same response path.

**Disposition — Defect, automate as failing.** The exception to this project's usual reluctance. The requirement is unambiguous, the failure is high-impact and user-facing rather than cosmetic, it is trivially reproducible, and it is genuinely the form's own fault rather than the API's. A standing failing test asserting that _some_ user-visible indication appears is worth its red CI cost here, and will go green by itself if DemoQA ever fixes it. Derive one condition asserting user-visible feedback on a duplicate username; keep it to one, and tag it so its expected-failure status is obvious to anyone reading a red run.

**DIVERGENCE-4 — submissions intermittently no-op with no explanation (REQ-REG-041).**
A submission sometimes produces no network request whatsoever and no message — consistently the first submission after a cold page load, measured at 1 in 5 trials. The reCAPTCHA widget is the presumed cause (`grecaptcha.getResponse()` throws "No reCAPTCHA clients exist" until the widget finishes initialising), but the form neither waits for it nor reports that it blocked the attempt. For a user this reads as a dead button; for automation it is a flaky first action.

**Disposition — Defect, do not automate.** Genuine, but a permanently failing test would be the wrong instrument — the behavior is intermittent, so the test would flake rather than fail honestly, which is worse than no test. Record it instead as a **constraint on test design**: any automated registration must tolerate the silent first-attempt no-op (see **Constraint on test design — the silent first submission** below). Revisit if the form gains an in-flight or captcha-pending state.

---

## Human review gate

- [ ] **No `observed` requirement encodes current behavior as the oracle.** Four candidates are isolated as DIVERGENCE-1 to -4 rather than written as intended behavior.
- [ ] **Each divergence's Disposition is signed off.** One `Accept as-is` (2), two `Defect — do not automate` (1, 4), and **one `Defect — automate as failing` (3)** — the last needs explicit human agreement before conditions are derived, since it deliberately introduces a standing red test.
- [ ] **No `assumed` requirement remains.** All requirements are `observed` or `inferred`. REQ-REG-021 is the only `inferred` one.
- [ ] **Requirements are testable statements, not implementation detail.** Each Statement names form behavior; DOM specifics (`is-invalid`, `p#name`, `#gotologin`) appear only in Evidence and Divergences.

**Reviewer notes.** Two items want a decision before conditions are written:

1. **DIVERGENCE-3's `automate as failing` disposition.** This is the first use of that disposition in the project — the login form's six divergences were all `Accept as-is` or `do not automate`. If a standing red test is unwanted here, the fallback is `Defect — do not automate` plus a recorded note, matching how DIVERGENCE-5 was handled on the login form. The argument for automating it as failing is that this defect is user-facing and permanent, not cosmetic or intermittent.
2. **REQ-REG-021 is `inferred`, not observed.** Length behavior was reasoned across from the login form rather than probed here. Either probe it on this form before deriving a boundary condition, or derive none and record the gap.

---

## Constraint on test design — the silent first submission

**An automated registration must not assume its first submission reaches the server.** Per DIVERGENCE-4, the first Register click after a cold page load intermittently produces no request and no feedback — measured at 1 in 5 trials on 2026-09-14, and observed repeatedly during exploration before being measured.

This interacts badly with the obvious test shape (`goto` → fill → click → assert). A test written that way fails intermittently on an assertion about the _outcome_, while the real cause is that the submission never happened — and the failure message will point at the missing success alert rather than the missing request.

Registration tests therefore need one of: a wait for the reCAPTCHA widget to finish initialising before the first click, or an assertion on the submission's outcome that tolerates and retries the no-op. Which of the two is right is an automation decision, not a requirement — but the constraint must be honoured, or the suite inherits a ~20% first-attempt flake rate on its most important test.

**Unlike the login form, this form imposes no signed-out-context requirement** (REQ-REG-053) — a leaked session does not hide it.

---

## Element reference

Supporting detail for implementation. Not requirements.

| Element           | Role + accessible name       | Fallback id   | Notes                                                                                                                                                                     |
| ----------------- | ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First Name field  | `textbox "First Name"`       | `#firstname`  | `type=text`, `required`, `placeholder="First Name"`, `autocomplete="off"`, no `maxlength`. **Note the id is all-lowercase**, unlike `#userName`                           |
| Last Name field   | `textbox "Last Name"`        | `#lastname`   | Same attributes; id all-lowercase                                                                                                                                         |
| UserName field    | `textbox "UserName"`         | `#userName`   | `type=text`, `required`, camelCase id — inconsistent with the two name fields above                                                                                       |
| Password field    | `textbox "Password"`         | `#password`   | `type=password`, `required`, `autocomplete="off"`; carries a complexity `pattern` the form does not enforce — see DIVERGENCE-2                                            |
| Register button   | `button "Register"`          | `#register`   | `type=button`. Unique as a button; note `h1 "Register"` also exists, so a non-exact _name_ match across roles would collide — matching by `button` role is already unique |
| Back to Login btn | `button "Back to Login"`     | `#gotologin`  | → `/login`                                                                                                                                                                |
| Error message     | `paragraph` (varies)         | `#name`       | Class `mb-1`, `color: rgb(255, 0, 0)`. Renders the server's message on a 400. **Stays empty on a 406 duplicate-username** — see DIVERGENCE-3                              |
| Invalid marking   | _(no accessible equivalent)_ | `.is-invalid` | CSS class on the offending input — the only signal for blank-field rejection; see DIVERGENCE-1                                                                            |
| Success alert     | _(native dialog)_            | —             | A browser `alert` reading "User Registered Successfully." — **not an in-page element.** Playwright needs a `dialog` handler; it cannot be located with `getByText`        |
| reCAPTCHA widget  | `iframe[title="reCAPTCHA"]`  | —             | v2 checkbox, 256×60, sitekey `6LfupSksAAAAALHNQnHsBoy3J8S7I79ujAhpQJwy`; `textarea[name="g-recaptcha-response"]` holds the token                                          |

All four inputs and both buttons have an accessible role and name, so `getByRole` satisfies the first tier of `docs/coding-standards.md`'s locator priority; **`testIdAttribute` is not needed** and has deliberately not been configured. The two exceptions are the blank-field marking (a CSS class) and the success alert (a native dialog, not a DOM node at all).

Other observations: the page title is `demosite` on every page, so it can never serve as a navigation assertion. **First Name and Last Name are collected but never transmitted** — the request body is `{"userName":…,"password":…}` only, so nothing downstream can assert on them. Advertisement iframes load after first paint beside and below the form. The form is React-rendered and not present at `domcontentloaded`, so auto-retrying assertions are required.

---

## Provenance log

| Date       | What was verified                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-14 | Field inventory and DOM attributes (all four `required`; ids `#firstname`/`#lastname`/`#userName`/`#password`; password `pattern` present; no `maxlength`/`minlength`)                                                                                                                                                                                        |
| 2026-09-14 | Blank-submission behavior: all four marked `is-invalid`, no request, no message, no `aria-invalid`                                                                                                                                                                                                                                                            |
| 2026-09-14 | Per-field marking confirmed across four partial-fill combinations from fresh page loads                                                                                                                                                                                                                                                                       |
| 2026-09-14 | Successful registration: `POST /Account/v1/User` → 201, native alert "User Registered Successfully.", all fields cleared, stays on `/register`, no session established. Reproduced three times                                                                                                                                                                |
| 2026-09-14 | Weak password: → 400 code 1300, full message rendered in `p#name` (red), values retained, no field marking                                                                                                                                                                                                                                                    |
| 2026-09-14 | Duplicate username: → 406 code 1204 "User exists!", **no alert, no `#name` text, no field marking**. Reproduced four times across two accounts                                                                                                                                                                                                                |
| 2026-09-14 | Whitespace-only in all four fields: passes the `required` check, request sent verbatim, rejected on the password rule                                                                                                                                                                                                                                         |
| 2026-09-14 | Request body carries only `userName` and `password` — first and last name are never transmitted                                                                                                                                                                                                                                                               |
| 2026-09-14 | Enter-key submission from the password field with a real `keyboard.press` → 201 and success alert                                                                                                                                                                                                                                                             |
| 2026-09-14 | `Back to Login` (`#gotologin`) → `/login`; accessible names each resolve to exactly one element; `h1 "Register"` coexists with `button "Register"`                                                                                                                                                                                                            |
| 2026-09-14 | Signed-in visit to `/register` leaves the form fully present — no "already logged in" substitution, unlike the login form                                                                                                                                                                                                                                     |
| 2026-09-14 | reCAPTCHA silent no-op measured: 1 of 5 consecutive trials sent no request and showed nothing, consistently the first after a cold load. Widget present as a v2 checkbox iframe; `grecaptcha.getResponse()` throws "No reCAPTCHA clients exist" before initialisation                                                                                         |
| 2026-09-14 | _Cleanup:_ `qa_reg_…`, `qa_dup_…`, `qa_dup2_…`, `qa_state_…` deleted via `DELETE /Account/v1/User/{id}` (all 204). **One orphan remains:** an account created by the Enter-key probe under `qa_enter_<timestamp>` whose exact name was not captured before the probe returned — harmless on a shared demo backend, recorded here rather than silently omitted |
