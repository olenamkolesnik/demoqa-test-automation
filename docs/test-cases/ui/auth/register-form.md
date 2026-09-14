# Test cases — Registration form (UI)

Derived from `docs/test-conditions/ui/auth/register-form.md`. One test case per condition; the three `COND-REGISTER-FORM-INF-*` entries are deliberately not covered — see that file for why.

> ⚠️ **REGISTER-FORM-009 is provisional and must not be automated yet.** It implements a condition that asserts a requirement the form does not currently meet (a duplicate username produces no feedback at all), so it is **expected to fail**. Sign-off on its `Defect — automate as failing` disposition is deferred until the project has seen how its suite reports a standing failure. Until that decision is taken it stays a manual check. Every other case in this file is unaffected.

**Two constraints apply to every case in this file**, both from `docs/ui-spec/register-form.requirements.md`:

- **The first submission after opening the page may silently do nothing** — no request, no message, no change on screen (measured 1 in 5 trials). A manual tester who sees nothing happen should click Register again before recording a defect; an automated test must tolerate it. This is DIVERGENCE-4, a known form defect.
- **Every successful registration creates a real account on a shared public backend** (Risk-1, `docs/test-plan.md` §8). Cases that register successfully must delete the account afterwards; cases that are rejected create nothing.

---

### TC: Submit the form with the first name missing

| Field          | Value                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-001                                                                                         |
| Condition      | COND-REGISTER-FORM-001                                                                                    |
| Risk           | —                                                                                                         |
| Preconditions  | None — the form is reachable signed in or signed out                                                      |
| Test data      | firstName: "" (left empty) / lastName: "Lovelace" / userName: "qa_reg_req_001" / password: "Aa1!aaaaaaaa" |
| Postconditions | None — no account is created and no request reaches the server                                            |
| Automation     | Not automated                                                                                             |

**Steps & expected results**

| #   | Action                                       | Expected result                                                                                                                                                                                                                                             |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                        | The registration form is visible with First Name, Last Name, UserName and Password fields, and Register and Back to Login buttons                                                                                                                           |
| 2   | Leave the First Name field empty             | The First Name field shows no value                                                                                                                                                                                                                         |
| 3   | Enter "Lovelace" in the Last Name field      | The typed last name appears in the field                                                                                                                                                                                                                    |
| 4   | Enter "qa_reg_req_001" in the UserName field | The typed username appears in the field                                                                                                                                                                                                                     |
| 5   | Enter "Aa1!aaaaaaaa" in the Password field   | The password is masked                                                                                                                                                                                                                                      |
| 6   | Click Register                               | The First Name field is highlighted as invalid (red border); the other three fields are not; no message appears; the page stays on /register. (Automation: `#firstname` carries the `is-invalid` CSS class and the other three do not; no request is sent.) |

**Notes**
There is no message and no accessible signal for this state — the only indicator is the field styling (DIVERGENCE-1). This is the documented exception to the locator-priority rule in `docs/coding-standards.md`, and the automated test must carry a comment saying so.

The First Name field's id is all-lowercase `#firstname`, unlike `#userName` — an easy thing to get wrong when writing the page object.

---

### TC: Submit the form with the last name missing

| Field          | Value                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-002                                                                                    |
| Condition      | COND-REGISTER-FORM-002                                                                               |
| Risk           | —                                                                                                    |
| Preconditions  | None                                                                                                 |
| Test data      | firstName: "Ada" / lastName: "" (left empty) / userName: "qa_reg_req_002" / password: "Aa1!aaaaaaaa" |
| Postconditions | None — no account is created and no request reaches the server                                       |
| Automation     | Not automated                                                                                        |

**Steps & expected results**

| #   | Action                                       | Expected result                                                                                                                                                                                           |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                        | The registration form is visible                                                                                                                                                                          |
| 2   | Enter "Ada" in the First Name field          | The typed first name appears in the field                                                                                                                                                                 |
| 3   | Leave the Last Name field empty              | The Last Name field shows no value                                                                                                                                                                        |
| 4   | Enter "qa_reg_req_002" in the UserName field | The typed username appears in the field                                                                                                                                                                   |
| 5   | Enter "Aa1!aaaaaaaa" in the Password field   | The password is masked                                                                                                                                                                                    |
| 6   | Click Register                               | The Last Name field is highlighted as invalid (red border); the other three are not; no message appears; the page stays on /register. (Automation: `#lastname` carries `is-invalid`; no request is sent.) |

**Notes**
Same styling-only signal as REGISTER-FORM-001 (DIVERGENCE-1). The id is all-lowercase `#lastname`.

---

### TC: Submit the form with the username missing

| Field          | Value                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-003                                                                              |
| Condition      | COND-REGISTER-FORM-003                                                                         |
| Risk           | —                                                                                              |
| Preconditions  | None                                                                                           |
| Test data      | firstName: "Ada" / lastName: "Lovelace" / userName: "" (left empty) / password: "Aa1!aaaaaaaa" |
| Postconditions | None — no account is created and no request reaches the server                                 |
| Automation     | Not automated                                                                                  |

**Steps & expected results**

| #   | Action                                     | Expected result                                                                                                                                                                                          |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                      | The registration form is visible                                                                                                                                                                         |
| 2   | Enter "Ada" in the First Name field        | The typed first name appears in the field                                                                                                                                                                |
| 3   | Enter "Lovelace" in the Last Name field    | The typed last name appears in the field                                                                                                                                                                 |
| 4   | Leave the UserName field empty             | The UserName field shows no value                                                                                                                                                                        |
| 5   | Enter "Aa1!aaaaaaaa" in the Password field | The password is masked                                                                                                                                                                                   |
| 6   | Click Register                             | The UserName field is highlighted as invalid (red border); the other three are not; no message appears; the page stays on /register. (Automation: `#userName` carries `is-invalid`; no request is sent.) |

**Notes**
Same styling-only signal as REGISTER-FORM-001 (DIVERGENCE-1).

---

### TC: Submit the form with the password missing

| Field          | Value                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------ |
| ID             | REGISTER-FORM-004                                                                                |
| Condition      | COND-REGISTER-FORM-004                                                                           |
| Risk           | —                                                                                                |
| Preconditions  | None                                                                                             |
| Test data      | firstName: "Ada" / lastName: "Lovelace" / userName: "qa_reg_req_004" / password: "" (left empty) |
| Postconditions | None — no account is created and no request reaches the server                                   |
| Automation     | Not automated                                                                                    |

**Steps & expected results**

| #   | Action                                       | Expected result                                                                                                                                                                                          |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                        | The registration form is visible                                                                                                                                                                         |
| 2   | Enter "Ada" in the First Name field          | The typed first name appears in the field                                                                                                                                                                |
| 3   | Enter "Lovelace" in the Last Name field      | The typed last name appears in the field                                                                                                                                                                 |
| 4   | Enter "qa_reg_req_004" in the UserName field | The typed username appears in the field                                                                                                                                                                  |
| 5   | Leave the Password field empty               | The Password field shows no value                                                                                                                                                                        |
| 6   | Click Register                               | The Password field is highlighted as invalid (red border); the other three are not; no message appears; the page stays on /register. (Automation: `#password` carries `is-invalid`; no request is sent.) |

**Notes**
Same styling-only signal as REGISTER-FORM-001 (DIVERGENCE-1).

---

### TC: Submit the form with every field empty

| Field          | Value                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-005                                                                               |
| Condition      | COND-REGISTER-FORM-005                                                                          |
| Risk           | —                                                                                               |
| Preconditions  | None                                                                                            |
| Test data      | firstName: "" / lastName: "" / userName: "" / password: "" (all four left empty — 0 characters) |
| Postconditions | None — no account is created and no request reaches the server                                  |
| Automation     | Not automated                                                                                   |

**Steps & expected results**

| #   | Action                                   | Expected result                                                                                                                                                                 |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                    | The registration form is visible with all four fields empty                                                                                                                     |
| 2   | Click Register without entering anything | All four fields are highlighted as invalid (red border); no message appears; the page stays on /register. (Automation: all four inputs carry `is-invalid`; no request is sent.) |

**Notes**
This is the only case that shows all four fields marked at once, which is what demonstrates the check is per-field rather than form-wide.

The empty boundary. Its neighbour one step outside is REGISTER-FORM-006 (whitespace-only), which passes the required check — together they place the boundary exactly between 0 and 1 characters.

---

### TC: Submit the form with whitespace-only values

| Field          | Value                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-006                                                                           |
| Condition      | COND-REGISTER-FORM-006                                                                      |
| Risk           | —                                                                                           |
| Preconditions  | None                                                                                        |
| Test data      | firstName: " " / lastName: " " / userName: " " / password: " " (three spaces in each field) |
| Postconditions | None — the server rejects the submission, so no account is created                          |
| Automation     | Not automated                                                                               |

**Steps & expected results**

| #   | Action                                        | Expected result                                                                                                                                                           |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                         | The registration form is visible                                                                                                                                          |
| 2   | Enter three spaces in each of the four fields | Each field shows the typed spaces                                                                                                                                         |
| 3   | Click Register                                | No field is highlighted as invalid; the submission is sent and the server rejects it, showing the password-complexity message above the form; the page stays on /register |

**Notes**
The boundary this case covers: whitespace is a value, so the required check passes and the form submits — the opposite outcome to REGISTER-FORM-005, from input that looks equally blank to a user.

The rejection cites the **password** rule, not the username, so the message shown is the same one as REGISTER-FORM-008 reached by a different route. Empty and whitespace-only remain two distinct input classes.

---

### TC: Register with valid details

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-007                                                                                                                                                                              |
| Condition      | COND-REGISTER-FORM-007                                                                                                                                                                         |
| Risk           | Risk-1                                                                                                                                                                                         |
| Preconditions  | The chosen username is not already registered                                                                                                                                                  |
| Test data      | firstName: "Ada" / lastName: "Lovelace" / userName: "qa_reg_ok_001" (must be unique per run — see Notes) / password: "Aa1!aaaaaaaa" (valid complexity: upper, lower, digit, special, 12 chars) |
| Postconditions | Account "qa_reg_ok_001" deleted via DELETE /Account/v1/User/{userId}                                                                                                                           |
| Automation     | Not automated                                                                                                                                                                                  |

**Steps & expected results**

| #   | Action                                      | Expected result                                                                           |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                       | The registration form is visible                                                          |
| 2   | Enter "Ada" in the First Name field         | The typed first name appears in the field                                                 |
| 3   | Enter "Lovelace" in the Last Name field     | The typed last name appears in the field                                                  |
| 4   | Enter "qa_reg_ok_001" in the UserName field | The typed username appears in the field                                                   |
| 5   | Enter "Aa1!aaaaaaaa" in the Password field  | The password is masked                                                                    |
| 6   | Click Register                              | A browser alert appears reading exactly "User Registered Successfully."                   |
| 7   | Dismiss the alert                           | All four fields are now empty; the page is still /register; the user is **not** signed in |

**Notes**
The happy path, and the only case in this file that creates a real account — delete it afterwards (Risk-1).

**The username must be unique per run.** "qa_reg_ok_001" works the first time and then permanently hits REGISTER-FORM-009's duplicate path, silently doing nothing. A manual tester re-running this case must change the suffix; an automated version must generate one.

**The success signal is a native browser alert, not text on the page** — it cannot be found by searching the page content, and an automated test needs a dialog handler for it.

Registration does not sign the user in: reaching /profile afterwards still requires going through the login form.

---

### TC: Register with a password below the complexity rule

| Field          | Value                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-008                                                                                                                  |
| Condition      | COND-REGISTER-FORM-008                                                                                                             |
| Risk           | —                                                                                                                                  |
| Preconditions  | None                                                                                                                               |
| Test data      | firstName: "Ada" / lastName: "Lovelace" / userName: "qa_reg_weak_001" / password: "weak" (4 chars, no upper, no digit, no special) |
| Postconditions | None — the server rejects the submission, so no account is created                                                                 |
| Automation     | Not automated                                                                                                                      |

**Steps & expected results**

| #   | Action                                        | Expected result                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                         | The registration form is visible                                                                                                                                                                                                                                                                                                             |
| 2   | Enter "Ada" in the First Name field           | The typed first name appears in the field                                                                                                                                                                                                                                                                                                    |
| 3   | Enter "Lovelace" in the Last Name field       | The typed last name appears in the field                                                                                                                                                                                                                                                                                                     |
| 4   | Enter "qa_reg_weak_001" in the UserName field | The typed username appears in the field                                                                                                                                                                                                                                                                                                      |
| 5   | Enter "weak" in the Password field            | The password is masked                                                                                                                                                                                                                                                                                                                       |
| 6   | Click Register                                | A red message appears above the form reading "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer."; no field is highlighted as invalid; the page stays on /register; no alert appears |

**Notes**
The password rule is enforced by the server, not by the form. The Password field carries a complexity rule in its markup, but the form ignores it and submits anyway — so this case must be written against what the server returns, not against the field being blocked before submission (DIVERGENCE-2).

The message is shown as ordinary red text above the form. Whether a screen reader announces it on appearance was not checked — announcement is an accessibility concern excluded from scope (`docs/test-plan.md` §2).

---

### TC: Register with a username that is already taken

| Field          | Value                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-009                                                                                                             |
| Condition      | COND-REGISTER-FORM-009                                                                                                        |
| Risk           | Risk-1, Risk-2                                                                                                                |
| Preconditions  | An account with the chosen username already exists (created via API: POST /Account/v1/User)                                   |
| Test data      | firstName: "Ada" / lastName: "Lovelace" / userName: "qa_reg_dup_001" (the already-registered name) / password: "Aa1!aaaaaaaa" |
| Postconditions | The pre-existing account "qa_reg_dup_001" deleted via DELETE /Account/v1/User/{userId}; no second account is created          |
| Automation     | Evaluated, not automated — provisional pending DIVERGENCE-3 sign-off, see Notes                                               |

**Steps & expected results**

| #   | Action                                       | Expected result                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                        | The registration form is visible                                                                                                                                                                                                                                                                   |
| 2   | Enter "Ada" in the First Name field          | The typed first name appears in the field                                                                                                                                                                                                                                                          |
| 3   | Enter "Lovelace" in the Last Name field      | The typed last name appears in the field                                                                                                                                                                                                                                                           |
| 4   | Enter "qa_reg_dup_001" in the UserName field | The typed username appears in the field                                                                                                                                                                                                                                                            |
| 5   | Enter "Aa1!aaaaaaaa" in the Password field   | The password is masked                                                                                                                                                                                                                                                                             |
| 6   | Click Register                               | Some visible indication that the username is already taken — an alert, a message above the form, or a highlighted field. Any one of the three satisfies this case. (Automation: if the indication is a highlighted field, it carries the `is-invalid` CSS class, as in REGISTER-FORM-001 to -005.) |

**Notes**
⚠️ **This case is expected to fail, and is provisional.**

**What actually happens today:** nothing at all. No alert, no message, no field highlighting, no clearing, no navigation — the form looks exactly as it did before the click. The server does answer correctly (it reports the username is taken), but the form discards that answer. A user cannot tell this apart from the submission simply not having registered, which is also what DIVERGENCE-4's silent no-op looks like.

This case deliberately states the **required** behavior rather than the observed one, per DIVERGENCE-3's `Defect — automate as failing` disposition. It is the first use of that disposition in this project, and sign-off on it is **deferred** until the project has seen how its suite reports a standing failure. Until that decision is taken this case stays manual — do not automate it. If the disposition is downgraded to `Defect — do not automate`, this case is withdrawn and its condition becomes an infeasible entry.

Step 6's expected result is deliberately loose about _which_ indication appears, because the requirement does not dictate a mechanism — a stricter wording would fail for a second, unrelated reason if the form were fixed differently than expected.

Seed the precondition account through the API rather than by registering twice through the form: it is cheaper, and it avoids compounding the silent-no-op flakiness across two submissions.

---

### TC: Correct a rejected submission without retyping

| Field          | Value                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-010                                                                                                 |
| Condition      | COND-REGISTER-FORM-010                                                                                            |
| Risk           | —                                                                                                                 |
| Preconditions  | None                                                                                                              |
| Test data      | firstName: "Ada" / lastName: "Lovelace" / userName: "qa_reg_keep_001" / password: "weak" (rejected by the server) |
| Postconditions | None — the server rejects the submission, so no account is created                                                |
| Automation     | Not automated                                                                                                     |

**Steps & expected results**

| #   | Action                                        | Expected result                                                                                      |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /register                         | The registration form is visible                                                                     |
| 2   | Enter "Ada" in the First Name field           | The typed first name appears in the field                                                            |
| 3   | Enter "Lovelace" in the Last Name field       | The typed last name appears in the field                                                             |
| 4   | Enter "qa_reg_keep_001" in the UserName field | The typed username appears in the field                                                              |
| 5   | Enter "weak" in the Password field            | The password is masked                                                                               |
| 6   | Click Register                                | The password-complexity message appears above the form                                               |
| 7   | Observe all four fields                       | All four still hold exactly what was entered: "Ada", "Lovelace", "qa_reg_keep_001", and the password |

**Notes**
The subject of this case is what survives the rejection, not the rejection itself — steps 2 to 5 are ordinary data entry, and step 7 is where the verification happens.

The contrast with REGISTER-FORM-007 is the point: a successful registration clears the form, a rejected one preserves it so the user can fix one field rather than start again.

---

### TC: Return to the login form from registration

| Field          | Value                  |
| -------------- | ---------------------- |
| ID             | REGISTER-FORM-011      |
| Condition      | COND-REGISTER-FORM-011 |
| Risk           | —                      |
| Preconditions  | None                   |
| Test data      | None                   |
| Postconditions | None                   |
| Automation     | Not automated          |

**Steps & expected results**

| #   | Action                | Expected result                                              |
| --- | --------------------- | ------------------------------------------------------------ |
| 1   | Navigate to /register | The registration form is visible with a Back to Login button |
| 2   | Click Back to Login   | The page navigates to /login                                 |

**Notes**
Covers the transition only. The login form's own behavior is out of scope here — it has its own test cases in `docs/test-cases/ui/auth/login-form.md`.

---

### TC: Open the registration form while already signed in

| Field          | Value                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| ID             | REGISTER-FORM-012                                                                                    |
| Condition      | COND-REGISTER-FORM-012                                                                               |
| Risk           | Risk-1, Risk-2                                                                                       |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) and is signed in through the login form |
| Test data      | userName: "qa_reg_session_001" / password: "Aa1!aaaaaaaa"                                            |
| Postconditions | User signed out; account "qa_reg_session_001" deleted via DELETE /Account/v1/User/{userId}           |
| Automation     | Not automated                                                                                        |

**Steps & expected results**

| #   | Action                | Expected result                                                                                                                |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Navigate to /register | The full registration form is shown — all four fields and the Register button are present, exactly as they are when signed out |

**Notes**
The contrast with the login form is why this case exists: `/login` replaces its form entirely when a session is active, but `/register` does not. Anyone generalising from the login form's behavior will get this wrong.

The session must be established by driving the login form — DemoQA holds it in memory only, so an API-created account gets the tester as far as having credentials, never as far as being signed in.

This case's condition is `Low` priority and is expected to be filtered out when this file is automated, so it is likely to remain a manual check.

---

## Coverage

| Condition                  | Test case         | Notes                                                       |
| -------------------------- | ----------------- | ----------------------------------------------------------- |
| COND-REGISTER-FORM-001     | REGISTER-FORM-001 |                                                             |
| COND-REGISTER-FORM-002     | REGISTER-FORM-002 |                                                             |
| COND-REGISTER-FORM-003     | REGISTER-FORM-003 |                                                             |
| COND-REGISTER-FORM-004     | REGISTER-FORM-004 |                                                             |
| COND-REGISTER-FORM-005     | REGISTER-FORM-005 |                                                             |
| COND-REGISTER-FORM-006     | REGISTER-FORM-006 |                                                             |
| COND-REGISTER-FORM-007     | REGISTER-FORM-007 |                                                             |
| COND-REGISTER-FORM-008     | REGISTER-FORM-008 |                                                             |
| COND-REGISTER-FORM-009     | REGISTER-FORM-009 | Provisional — expected to fail, not to be automated yet     |
| COND-REGISTER-FORM-010     | REGISTER-FORM-010 |                                                             |
| COND-REGISTER-FORM-011     | REGISTER-FORM-011 |                                                             |
| COND-REGISTER-FORM-012     | REGISTER-FORM-012 | `Low` priority — expected to be filtered at automation time |
| COND-REGISTER-FORM-INF-001 | —                 | Infeasible: no accessible signal exists (DIVERGENCE-1)      |
| COND-REGISTER-FORM-INF-002 | —                 | Infeasible: silent no-op is intermittent (DIVERGENCE-4)     |
| COND-REGISTER-FORM-INF-003 | —                 | Infeasible: input length never probed on this form          |

All 12 non-infeasible conditions have exactly one test case. The three infeasible entries correctly have none.
