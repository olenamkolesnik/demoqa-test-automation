# Test conditions — Registration form (UI)

> ⚠️ **COND-REGISTER-FORM-009 is provisional — not yet signed off.**
> It is derived from DIVERGENCE-3's `Defect — automate as failing` disposition and asserts a
> requirement the form does not currently meet, so it is **expected to fail**. The basis's own
> human review gate (`docs/ui-spec/register-form.requirements.md`) is still unticked, and its
> reviewer notes require explicit agreement before this disposition is acted on — that decision is
> deliberately deferred until the project has seen how its suite reports a standing failure.
> Until it is taken, treat -009 as provisional: do not automate it, and if the disposition is
> downgraded to `Defect — do not automate`, -009 becomes an infeasible entry instead. Every other
> condition in this file is unaffected.

## Feature analysis

**Feature:** Registration form, `https://demoqa.com/register` (UI)
**Source:** `docs/ui-spec/register-form.requirements.md` (live-verified 2026-09-14) — the sole test basis. No live probing was performed while writing these conditions; anything the requirements file does not record is an open question, not something to resolve here.
**Test level:** System-level, black-box, per `docs/test-plan.md` §4.

**Happy path**

- A valid first name, last name, username, and password create an account, confirmed by a native browser alert, with the form cleared and the user left on `/register` un-signed-in (REQ-REG-001, -002, -003, -004)

**Negative cases**

- Each of the four fields blank in turn, and all four blank — submission blocked client-side, only the empty fields marked (REQ-REG-010, -011, -013)
- A password not meeting the complexity rule — rejected server-side with a specific in-page message (REQ-REG-030, -033)
- A username already registered — rejected server-side, but with **no user-visible feedback at all** (REQ-REG-031, DIVERGENCE-3)
- Entered values survive a failed attempt so they can be corrected (REQ-REG-032)

**Boundary cases**

- Empty vs. whitespace-only input — the required check treats `"   "` as a value, so the boundary sits exactly between 0 and 1 characters; whitespace passes the client check and is rejected server-side on the password rule (REQ-REG-014)
- Input length: no `maxlength`/`minlength` declared, but **not probed on this form** — REQ-REG-021 is `inferred`, reasoned across from the login form. No length condition is derived; see **Spec ambiguities** and COND-REGISTER-FORM-INF-003.

**State transitions**

- Form ready → (valid) account created, alert raised, fields cleared, still on `/register` with no session (REQ-REG-001, -003, -004)
- Form ready → (invalid) rejected, values retained, still on `/register` (REQ-REG-030, -032)
- Active session → `/register` still shows the full form, unlike `/login` (REQ-REG-053)
- Registration form → `Back to Login` → `/login` (REQ-REG-051)

**Requirements deliberately yielding no condition**

Three divergence dispositions (`docs/ui-spec/register-form.requirements.md`) instruct test design to derive no condition, or to narrow what may be asserted. Recorded here so the omissions are visible, and documented as infeasible below:

- REQ-REG-012 — accessible invalid state: DIVERGENCE-1, `Defect — do not automate` (accessibility out of scope, `docs/test-plan.md` §2). Note this disposition **does** direct conditions for REQ-REG-010/-011 to use the `is-invalid` class; what it forbids is asserting an accessible signal that does not exist. COND-REGISTER-FORM-001 to -005 are derived on that instruction.
- REQ-REG-020 — the unenforced client-side password `pattern`: DIVERGENCE-2, `Accept as-is`. No condition asserts client-side blocking; the observed server-side path is covered by COND-REGISTER-FORM-008 instead.
- REQ-REG-041 — silent blocked submission: DIVERGENCE-4, `Defect — do not automate` (intermittent, so a standing test would flake rather than fail honestly). Recorded as a constraint on automation instead — see COND-REGISTER-FORM-INF-002.

**One requirement is derived as an expected failure — provisionally**

- REQ-REG-031 — duplicate username produces no user-visible feedback: DIVERGENCE-3, `Defect — automate as failing`. **This is the project's first use of that disposition.** Exactly one condition (COND-REGISTER-FORM-009) asserts the requirement, not the observed behavior, and would therefore fail until DemoQA fixes the form. **Sign-off on that disposition is deferred, so -009 is provisional and must not be automated yet** — see the banner at the top of this file. It is derived rather than omitted so the decision, when taken, is a yes/no on something concrete.

**Spec ambiguities / unknowns**

- **Unresolved** — input length (REQ-REG-021) is `inferred`/`medium`, reasoned across from the login form rather than probed on this form. The requirements file's own review gate flags this. No length condition is derived; recorded as COND-REGISTER-FORM-INF-003 so the gap stays visible rather than looking like an oversight.
- **Unresolved** — whether the in-page error is _announced_ to assistive technology (REQ-REG-033 is `medium` confidence — no `role="alert"` or live region was checked). Out of scope per `docs/test-plan.md` §2; affects COND-REGISTER-FORM-008's Notes only.
- **Recorded, not a gap** — first and last name are collected but never transmitted (`{"userName":…,"password":…}` only). No condition can assert anything about them server-side; COND-REGISTER-FORM-001/-002 cover them only as required fields.
- The requirements file's **human review gate is unticked** as of writing, and its reviewer notes flag DIVERGENCE-3's disposition as needing explicit sign-off. These conditions honour the disposition as written; if it is downgraded to `do not automate`, COND-REGISTER-FORM-009 becomes an infeasible entry instead.

---

## Input field

### COND-REGISTER-FORM-001: First name is required

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| ID         | COND-REGISTER-FORM-001                |
| Priority   | High                                  |
| Category   | Input field                           |
| Technique  | EP                                    |
| Source     | REQ-REG-010, REQ-REG-011, REQ-REG-013 |
| Test cases | —                                     |

**What to cover**
Submitting with the first name empty and the other three fields filled blocks submission client-side and marks only the first name field.

**Values / boundaries**

```
firstName: ""   lastName: "Lovelace"   userName: "qa_reg_req_001"   password: "Aa1!aaaaaaaa"
  → blocked; #firstname gains .is-invalid; the other three stay clean; no network request
```

**Notes**
The only observable signal is the `is-invalid` CSS class — no message, no ARIA state (DIVERGENCE-1). This is the documented exception to the locator-priority rule in `docs/coding-standards.md`; the automated test must carry a comment saying why a raw CSS class was necessary. Note the id is all-lowercase `#firstname`, unlike `#userName`.

---

### COND-REGISTER-FORM-002: Last name is required

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| ID         | COND-REGISTER-FORM-002                |
| Priority   | High                                  |
| Category   | Input field                           |
| Technique  | EP                                    |
| Source     | REQ-REG-010, REQ-REG-011, REQ-REG-013 |
| Test cases | —                                     |

**What to cover**
Submitting with the last name empty and the other three fields filled blocks submission client-side and marks only the last name field.

**Values / boundaries**

```
firstName: "Ada"   lastName: ""   userName: "qa_reg_req_002"   password: "Aa1!aaaaaaaa"
  → blocked; #lastname gains .is-invalid; the other three stay clean; no network request
```

**Notes**
Same styling-only signal as COND-REGISTER-FORM-001 (DIVERGENCE-1). Id is all-lowercase `#lastname`.

---

### COND-REGISTER-FORM-003: Username is required

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| ID         | COND-REGISTER-FORM-003                |
| Priority   | High                                  |
| Category   | Input field                           |
| Technique  | EP                                    |
| Source     | REQ-REG-010, REQ-REG-011, REQ-REG-013 |
| Test cases | —                                     |

**What to cover**
Submitting with the username empty and the other three fields filled blocks submission client-side and marks only the username field.

**Values / boundaries**

```
firstName: "Ada"   lastName: "Lovelace"   userName: ""   password: "Aa1!aaaaaaaa"
  → blocked; #userName gains .is-invalid; the other three stay clean; no network request
```

**Notes**
Same styling-only signal as COND-REGISTER-FORM-001 (DIVERGENCE-1).

---

### COND-REGISTER-FORM-004: Password is required

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| ID         | COND-REGISTER-FORM-004                |
| Priority   | High                                  |
| Category   | Input field                           |
| Technique  | EP                                    |
| Source     | REQ-REG-010, REQ-REG-011, REQ-REG-013 |
| Test cases | —                                     |

**What to cover**
Submitting with the password empty and the other three fields filled blocks submission client-side and marks only the password field.

**Values / boundaries**

```
firstName: "Ada"   lastName: "Lovelace"   userName: "qa_reg_req_004"   password: ""
  → blocked; #password gains .is-invalid; the other three stay clean; no network request
```

**Notes**
Same styling-only signal as COND-REGISTER-FORM-001 (DIVERGENCE-1). This is the observed `all-but-password` combination from the basis.

---

### COND-REGISTER-FORM-005: All four fields blank are marked together

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| ID         | COND-REGISTER-FORM-005                |
| Priority   | Medium                                |
| Category   | Input field                           |
| Technique  | BVA                                   |
| Source     | REQ-REG-010, REQ-REG-011, REQ-REG-013 |
| Test cases | —                                     |

**What to cover**
Submitting an entirely empty form blocks submission and marks all four fields at once, which is what shows the check is per-field rather than form-wide.

**Values / boundaries**

```
firstName: ""   lastName: ""   userName: ""   password: ""   (0 characters — the empty boundary)
  → blocked; all four inputs gain .is-invalid; no network request
```

**Notes**
The empty boundary. Its neighbour one step outside is whitespace-only (COND-REGISTER-FORM-006), which passes the required check — together they place the boundary exactly between 0 and 1 characters. Independently testable from -001 to -004: this asserts the all-at-once marking those four cannot show individually.

---

### COND-REGISTER-FORM-006: Whitespace-only input passes the required check

| Field      | Value                  |
| ---------- | ---------------------- |
| ID         | COND-REGISTER-FORM-006 |
| Priority   | Medium                 |
| Category   | Input field            |
| Technique  | BVA                    |
| Source     | REQ-REG-014            |
| Test cases | —                      |

**What to cover**
Whitespace is treated as a value, so the client-side required check passes and the credentials are submitted for server validation — the opposite outcome to the empty form, from input that looks equally blank.

**Values / boundaries**

```
firstName: "   "   lastName: "   "   userName: "   "   password: "   "   (1+ characters — one step outside the empty boundary)
  → NOT blocked; no .is-invalid on any field; request sent; server rejects on the password rule
```

**Notes**
Contrast COND-REGISTER-FORM-005, where the same visually-blank form is blocked entirely. The server's rejection here cites the password rule, not the username — so the observable outcome is the same in-page message as COND-REGISTER-FORM-008, reached by a different route. Empty and whitespace-only remain distinct equivalence classes.

---

## Behavior

### COND-REGISTER-FORM-007: Valid details create an account

| Field      | Value                                              |
| ---------- | -------------------------------------------------- |
| ID         | COND-REGISTER-FORM-007                             |
| Priority   | High                                               |
| Category   | Behavior                                           |
| Technique  | EP                                                 |
| Source     | REQ-REG-001, REQ-REG-002, REQ-REG-003, REQ-REG-004 |
| Test cases | —                                                  |

**What to cover**
A complete, valid set of details creates the account, confirms it to the user, clears the form, and leaves the user on `/register` without signing them in.

**Values / boundaries**

```
firstName: "Ada"   lastName: "Lovelace"
userName: "qa_reg_ok_<unique suffix>"   password: "Aa1!aaaaaaaa"
  → native browser alert "User Registered Successfully."
  → all four fields cleared to ""
  → URL stays /register; no session established
```

**Notes**
The valid EP class — the one happy-path condition in this file. The four observations are one outcome, not four conditions: they are all effects of the same successful submission and cannot be exercised independently (no trigger/effect splitting).

**Two automation constraints, both from the basis.** The success signal is a **native browser `alert`**, not an in-page element — it needs a Playwright `dialog` handler and cannot be located with `getByText`. And the username must be unique per run: a fixed value would pass once and then hit COND-REGISTER-FORM-009's duplicate path forever after. The account created is real and must be torn down (Risk-1, `docs/test-plan.md` §8).

---

### COND-REGISTER-FORM-008: A password below the complexity rule is rejected with a reason

| Field      | Value                    |
| ---------- | ------------------------ |
| ID         | COND-REGISTER-FORM-008   |
| Priority   | High                     |
| Category   | Behavior                 |
| Technique  | EP                       |
| Source     | REQ-REG-030, REQ-REG-033 |
| Test cases | —                        |

**What to cover**
A password not meeting the complexity rule is rejected and the specific reason is shown to the user in the page.

**Values / boundaries**

```
firstName: "Ada"   lastName: "Lovelace"   userName: "qa_reg_weak_<unique suffix>"   password: "weak"
  → no account created
  → in-page message: "Passwords must have at least one non alphanumeric character, one digit
    ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and
    Password must be eight characters or longer."
  → no .is-invalid on any field; URL stays /register
```

**Notes**
The invalid EP class for the password. Per DIVERGENCE-2 (`Accept as-is`), this asserts the **observed server-side path** — the form submits and the server rejects. It must not assert client-side blocking: `#password` declares a complexity `pattern` and `checkValidity()` returns `false`, but the form submits anyway and the attribute surfaces nothing. A test asserting the field was blocked would be asserting behavior the form does not have.

REQ-REG-033 is `medium` confidence: the message is present in the DOM as a paragraph, but whether it is _announced_ to assistive technology was not checked. This condition covers the message being present and readable only; announcement is out of scope (`docs/test-plan.md` §2).

---

### COND-REGISTER-FORM-009: A duplicate username is reported to the user (expected to fail)

| Field      | Value                     |
| ---------- | ------------------------- |
| ID         | COND-REGISTER-FORM-009    |
| Priority   | High                      |
| Category   | Behavior                  |
| Technique  | EP                        |
| Source     | REQ-REG-031, DIVERGENCE-3 |
| Test cases | —                         |

**What to cover**
Attempting to register a username that already exists tells the user that is why the attempt failed.

**Values / boundaries**

```
Precondition: an account with userName "qa_reg_dup_<unique suffix>" already exists
firstName: "Ada"   lastName: "Lovelace"   userName: "<that same name>"   password: "Aa1!aaaaaaaa"
  → some user-visible indication that the username is taken
     (an alert, an in-page message, or a field marking — any one of the three satisfies this)
```

**Values observed instead (what the test will actually hit until the defect is fixed)**

```
  → nothing. No alert, no #name text, no .is-invalid, no clearing, no navigation.
     The server answers correctly but the form discards the response.
```

**Notes**
⚠️ **This condition asserts the requirement, not the observed behavior, and is therefore expected to fail.** Its disposition is DIVERGENCE-3, `Defect — automate as failing` — the first use of that disposition in this project. The test case derived from it must be tagged so a red run is immediately legible as this known defect rather than a regression; a reader seeing it fail should not go hunting.

Kept deliberately to **one** condition, per the disposition's own instruction. The assertion is intentionally loose — "any user-visible indication" — because the requirement does not dictate which mechanism, and a stricter assertion would fail for a second reason if DemoQA fixed it differently than expected. It will go green by itself when the form starts handling the 406.

Needs a real pre-existing account, so it carries the same Risk-1 teardown obligation as COND-REGISTER-FORM-007. Seeding the precondition through the API rather than by registering twice through the form is both cheaper and avoids compounding DIVERGENCE-4's flakiness.

---

### COND-REGISTER-FORM-010: Entered values survive a rejected attempt

| Field      | Value                  |
| ---------- | ---------------------- |
| ID         | COND-REGISTER-FORM-010 |
| Priority   | Medium                 |
| Category   | Behavior               |
| Technique  | EP                     |
| Source     | REQ-REG-032            |
| Test cases | —                      |

**What to cover**
After a rejected submission all four fields still hold what the user typed, so the input can be corrected rather than retyped.

**Values / boundaries**

```
firstName: "Ada"   lastName: "Lovelace"   userName: "qa_reg_keep_<unique suffix>"   password: "weak"
  → after the rejection, all four fields still read exactly what was entered
```

**Notes**
Distinct from COND-REGISTER-FORM-007's clearing behavior, and the contrast is the point: a success clears the form, a failure preserves it. Independently testable — this asserts field values, not the error message COND-REGISTER-FORM-008 asserts, even though one submission exhibits both.

---

## State

### COND-REGISTER-FORM-011: Registration is reachable back to login

| Field      | Value                  |
| ---------- | ---------------------- |
| ID         | COND-REGISTER-FORM-011 |
| Priority   | Medium                 |
| Category   | State                  |
| Technique  | State transition       |
| Source     | REQ-REG-051            |
| Test cases | —                      |

**What to cover**
From the registration form, the `Back to Login` control transitions the user to the login page.

**Values / boundaries**

```
Click "Back to Login" → URL becomes /login
```

**Notes**
Covers the transition only. The login form's own behavior is out of scope for this file — it has its own basis and conditions (`docs/test-conditions/ui/auth/login-form.md`).

Per the login-form pipeline's own retrospective, a transition case whose expected results describe the _destination_ page's content belongs with that page's suite; this one asserts arrival only, so it stays here.

---

### COND-REGISTER-FORM-012: The form remains available to a signed-in user

| Field      | Value                  |
| ---------- | ---------------------- |
| ID         | COND-REGISTER-FORM-012 |
| Priority   | Low                    |
| Category   | State                  |
| Technique  | State transition       |
| Source     | REQ-REG-053            |
| Test cases | —                      |

**What to cover**
Reaching `/register` with an active session still shows the full registration form, rather than replacing it with an already-signed-in state the way `/login` does.

**Values / boundaries**

```
Active session → navigate to /register → the four inputs and the Register button are all present
```

**Notes**
The contrast with REQ-LOGIN-003 is the reason this is worth recording: the two forms behave oppositely in the same situation, so an automation author who generalises from the login form will get this wrong.

`Low` priority: it is a negative-space assertion (nothing is replaced), and no user journey depends on it. It also carries a real setup cost — establishing a session requires driving the login form, since DemoQA holds the session in React memory and it cannot be seeded from an API token. Expected to be filtered out at automation time; recorded so the omission is a decision rather than an oversight.

---

## Infeasible conditions

### COND-REGISTER-FORM-INF-001: Blank-field rejection is exposed accessibly (infeasible)

| Field      | Value                      |
| ---------- | -------------------------- |
| ID         | COND-REGISTER-FORM-INF-001 |
| Priority   | Medium                     |
| Category   | Input field                |
| Technique  | EP                         |
| Source     | REQ-REG-012, DIVERGENCE-1  |
| Test cases | —                          |

**What to cover**
That a field whose absence blocked submission exposes a programmatically determinable invalid state — `aria-invalid`, an associated error message, or an accessibility-tree entry.

**Why infeasible**
No such signal exists. The sole indication is the `is-invalid` CSS class producing a red border: no message text, no ARIA state, nothing in the accessibility tree, no `role="alert"` (verified 2026-09-14). A condition asserting an accessible signal would assert something the form has never had.

**Mitigation**
DIVERGENCE-1's disposition is `Defect — do not automate`: a real accessibility defect, but accessibility testing is out of scope (`docs/test-plan.md` §2), so a permanently failing test would not earn its place. The same disposition directs COND-REGISTER-FORM-001 to -005 to use the `is-invalid` class instead — the only signal available. Identical in kind to the login form's `COND-LOGIN-FORM-INF-001`. Revisit if the form gains an accessible invalid state.

---

### COND-REGISTER-FORM-INF-002: A blocked submission is reported to the user (infeasible)

| Field      | Value                      |
| ---------- | -------------------------- |
| ID         | COND-REGISTER-FORM-INF-002 |
| Priority   | Medium                     |
| Category   | Behavior                   |
| Technique  | Exploratory heuristic      |
| Source     | REQ-REG-041, DIVERGENCE-4  |
| Test cases | —                          |

**What to cover**
That when a submission is blocked before reaching the server, the form says so rather than appearing to do nothing.

**Why infeasible**
The behavior is **intermittent**, not absent: measured at 1 silent no-op in 5 consecutive trials, consistently the first submission after a cold page load (2026-09-14). A test asserting the requirement would flake rather than fail honestly — passing on the 4 trials where the submission goes through and failing on the 1 where it does not, with no way to tell that apart from a genuine regression. That is strictly worse than no test.

**Mitigation**
DIVERGENCE-4's disposition is `Defect — do not automate` for exactly this reason. The finding is carried instead as a **constraint on every automated test in this file**, per the requirements file's _Constraint on test design — the silent first submission_: any test that submits this form must tolerate the silent first-attempt no-op, or the suite inherits a ~20% first-attempt flake rate on COND-REGISTER-FORM-007, its most important case. Whether that means waiting for the reCAPTCHA widget to initialise or retrying the submission is an automation decision, not a test-design one. Revisit if the form gains an in-flight or captcha-pending state.

---

### COND-REGISTER-FORM-INF-003: Input length has no upper bound (infeasible — unverified)

| Field      | Value                      |
| ---------- | -------------------------- |
| ID         | COND-REGISTER-FORM-INF-003 |
| Priority   | Low                        |
| Category   | Input field                |
| Technique  | BVA                        |
| Source     | REQ-REG-021                |
| Test cases | —                          |

**What to cover**
That the four inputs accept input of any length without truncating it — and, if a maximum exists, where it sits.

**Why infeasible**
Not infeasible against the SUT — infeasible against the **basis**. REQ-REG-021 is the only `inferred`/`medium`-confidence requirement in the requirements file: no input declares `maxlength` or `minlength`, but length was never probed on this form. It was reasoned across from the login form (REQ-LOGIN-022, probed to 50,000 characters with no limit found) on the grounds that both feed the same `/Account` endpoints. That is plausible, not verified. Deriving a boundary condition from it would put a concrete value into a test case that no observation supports.

**Mitigation**
The requirements file's own review gate flags this and offers the choice: probe it on this form before deriving a condition, or derive none and record the gap. This entry is that record. The user deliberately declined the probe when the requirements were written, so no length condition exists — a decision, not an oversight. Promote this to a numbered condition if the probe is ever run; the finding would go back into `docs/ui-spec/register-form.requirements.md` first.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Yes — all four are exercised as valid input by COND-REGISTER-FORM-007                                                                                    |
| Does every required input field have at least one invalid EP condition?                | Yes — COND-REGISTER-FORM-001 (first name), -002 (last name), -003 (username), -004 (password)                                                            |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Yes for the required-check boundary — COND-REGISTER-FORM-005 (empty) and -006 (whitespace, one step outside). Length boundaries: none — see INF-003      |
| Does every authorization state produce a distinct condition?                           | Not applicable — a registration form has no token to vary. Session state is covered as a state transition (COND-REGISTER-FORM-012)                       |
| Are all infeasible conditions documented?                                              | Yes — INF-001 (accessible signal), INF-002 (silent no-op), INF-003 (unprobed length)                                                                     |
| Does every analysis bullet map to at least one condition?                              | Yes                                                                                                                                                      |
| Does every item in the test basis map to a condition or a documented infeasible entry? | Yes — verified mechanically, see below                                                                                                                   |
| Are all conditions independently testable?                                             | Yes — no condition depends on another's execution. COND-REGISTER-FORM-009 needs a seeded account, which is a precondition, not a dependency on a sibling |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — the closest pair is -008 (error message) and -010 (values retained), which one submission exhibits but which assert different observables           |

**Basis coverage verified mechanically.** All 22 `REQ-REG-NNN` ids in `docs/ui-spec/register-form.requirements.md` map to a condition or an infeasible entry (`comm -23` of basis vs. cited ids returns empty):

Every id is written out in full rather than abbreviated as `-002, -003`, so the table itself is greppable — an abbreviated row looks identical to a missing one to any mechanical check.

| REQ         | Mapped to                                                                    |
| ----------- | ---------------------------------------------------------------------------- |
| REQ-REG-001 | COND-REGISTER-FORM-007                                                       |
| REQ-REG-002 | COND-REGISTER-FORM-007                                                       |
| REQ-REG-003 | COND-REGISTER-FORM-007                                                       |
| REQ-REG-004 | COND-REGISTER-FORM-007                                                       |
| REQ-REG-010 | COND-REGISTER-FORM-001, -002, -003, -004, -005                               |
| REQ-REG-011 | COND-REGISTER-FORM-001, -002, -003, -004, -005                               |
| REQ-REG-012 | COND-REGISTER-FORM-INF-001 (DIVERGENCE-1, do not automate)                   |
| REQ-REG-013 | COND-REGISTER-FORM-001, -002, -003, -004, -005                               |
| REQ-REG-014 | COND-REGISTER-FORM-006                                                       |
| REQ-REG-020 | COND-REGISTER-FORM-008 (DIVERGENCE-2, accept as-is — observed path asserted) |
| REQ-REG-021 | COND-REGISTER-FORM-INF-003 (unprobed on this form)                           |
| REQ-REG-022 | **No condition — see Coverage gaps**                                         |
| REQ-REG-030 | COND-REGISTER-FORM-008                                                       |
| REQ-REG-031 | COND-REGISTER-FORM-009 (DIVERGENCE-3, automate as failing)                   |
| REQ-REG-032 | COND-REGISTER-FORM-010                                                       |
| REQ-REG-033 | COND-REGISTER-FORM-008                                                       |
| REQ-REG-040 | **No condition — see Coverage gaps**                                         |
| REQ-REG-041 | COND-REGISTER-FORM-INF-002 (DIVERGENCE-4, do not automate)                   |
| REQ-REG-050 | **No condition — see Coverage gaps**                                         |
| REQ-REG-051 | COND-REGISTER-FORM-011                                                       |
| REQ-REG-052 | **No condition — see Coverage gaps**                                         |
| REQ-REG-053 | COND-REGISTER-FORM-012                                                       |

**Coverage gaps identified**

- **REQ-REG-022 (password stays masked)** — no condition. `type="password"` masking is enforced by the browser's own rendering, not by application logic that could regress independently of it; the form sets the attribute once and has no show/hide control, so an assertion here exercises the browser rather than the SUT. **Note this diverges from the sibling file:** the login form _did_ derive a condition for its equivalent requirement (`COND-LOGIN-FORM-011`, REQ-LOGIN-024, Medium, Exploratory heuristic). The divergence is deliberate — that condition was subsequently evaluated during the login form's own automation pass and dropped as browser-native behavior not worth automating, which is the reasoning applied here from the outset rather than after the fact.
- **REQ-REG-040 (protected against automated submission)** — no condition. The reCAPTCHA widget's presence is observable, but "is protected against bots" is not a behavior this suite can assert: confirming protection works would mean defeating it, and confirming the widget merely exists tests markup rather than behavior. Its practical consequence — the silent no-op — is captured as COND-REGISTER-FORM-INF-002.
- **REQ-REG-050 (accessible label per input)** — no condition. Every locator in every condition above resolves by accessible role and name, so a regression here fails the whole file loudly at its first interaction; a dedicated condition would add no detection the suite does not already have. **Note this diverges from the sibling file:** the login form _did_ derive `COND-LOGIN-FORM-015` (REQ-LOGIN-050) — at `Low` priority, and its test case is recorded `Not automated`. So the two files reach the same practical outcome (no automated test) by different routes: the login form records the condition then filters it, this file declines to derive it. Deriving a `Low` condition whose own automation is a foregone conclusion is the weaker of the two, but the divergence is noted rather than smoothed over.
- **REQ-REG-052 (keyboard submission)** — no condition. Deliberate scope decision: it is a second route into COND-REGISTER-FORM-007's already-covered happy path, and exercising it costs another real account on a shared public backend (Risk-1) for an assertion about the submit mechanism rather than the registration behavior. The login form did derive a condition for its equivalent (REQ-LOGIN-040) because a failed login costs nothing; here every successful submission is a real account. Revisit if a cheaper route is found — registering with a deliberately weak password would exercise Enter-key submission without creating an account, and would be the shape to use.

**Deferred conditions**

- **COND-REGISTER-FORM-009 is provisional, pending DIVERGENCE-3 sign-off** (see the banner at the top of this file) — it must not be automated until that decision is taken. This is a different kind of deferral from the two below: they are settled decisions about automation scope, whereas -009 is blocked on a human call that has been deliberately postponed until the project has seen how its suite reports a standing failure. If the disposition is downgraded to `Defect — do not automate`, -009 becomes an infeasible entry instead.
- COND-REGISTER-FORM-012 is expected to be filtered out at automation time (`Low` priority, per `generate-ui-tests`'s priority filter). Recorded rather than omitted so the decision is visible.
- COND-REGISTER-FORM-INF-003 is deferred pending a length probe on this form that the user declined; it would be promoted to a numbered condition if that probe is ever run.
