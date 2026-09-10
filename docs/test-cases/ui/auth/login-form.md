# Test cases — Login form (UI)

Derived from `docs/test-conditions/ui/auth/login-form.md`. One test case per condition; the four
`COND-LOGIN-FORM-INF-*` entries are deliberately not covered — see that file for why.

**Every test case in this file requires a signed-out browser context.** Reaching `/login` with an
active session shows no form at all (LOGIN-FORM-013), so a leaked session makes every other case
here fail at its first step. The session lives in React memory only and cannot be cleared through
storage, so "signed out" means a fresh browser context.

---

### TC: Submit the form with the username missing

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| ID             | LOGIN-FORM-001                                                 |
| Condition      | COND-LOGIN-FORM-001                                            |
| Risk           | —                                                              |
| Preconditions  | Browser is signed out (fresh context)                          |
| Test data      | userName: "" (left empty) / password: "Aa1!aaaaaaaa"           |
| Postconditions | None — no account is created and no request reaches the server |
| Automation     | Not automated                                                  |

**Steps & expected results**

| #   | Action                                     | Expected result                                                                                                                          |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                         | Login form is visible with UserName field, Password field, Login and New User buttons                                                    |
| 2   | Leave the UserName field empty             | The UserName field shows no value                                                                                                        |
| 3   | Enter "Aa1!aaaaaaaa" in the Password field | The password is masked                                                                                                                   |
| 4   | Click Login                                | The UserName field is highlighted as invalid (red border); the Password field is not; no error message appears; the page stays on /login |

**Notes**
There is no message and no accessible signal for this state — the only indicator is the field
styling. (Automation: the UserName input carries the `is-invalid` CSS class and the Password input
does not; no request is sent to `/Account/v1/GenerateToken`.) This is the documented exception to
the locator-priority rule in `docs/coding-standards.md`.

---

### TC: Submit the form with the password missing

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| ID             | LOGIN-FORM-002                                                 |
| Condition      | COND-LOGIN-FORM-002                                            |
| Risk           | —                                                              |
| Preconditions  | Browser is signed out (fresh context)                          |
| Test data      | userName: "qa_user_valid" / password: "" (left empty)          |
| Postconditions | None — no account is created and no request reaches the server |
| Automation     | Not automated                                                  |

**Steps & expected results**

| #   | Action                                      | Expected result                                                                                                                          |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                          | Login form is visible                                                                                                                    |
| 2   | Enter "qa_user_valid" in the UserName field | The typed username appears in the field                                                                                                  |
| 3   | Leave the Password field empty              | The Password field shows no value                                                                                                        |
| 4   | Click Login                                 | The Password field is highlighted as invalid (red border); the UserName field is not; no error message appears; the page stays on /login |

**Notes**
Same styling-only signal as LOGIN-FORM-001. (Automation: the Password input carries `is-invalid`,
the UserName input does not; no request is sent.)

---

### TC: Submit the form with both fields empty

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| ID             | LOGIN-FORM-003                                                 |
| Condition      | COND-LOGIN-FORM-003                                            |
| Risk           | —                                                              |
| Preconditions  | Browser is signed out (fresh context)                          |
| Test data      | userName: "" / password: "" (both left empty)                  |
| Postconditions | None — no account is created and no request reaches the server |
| Automation     | Not automated                                                  |

**Steps & expected results**

| #   | Action                                | Expected result                                                                                                                   |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                    | Login form is visible with both fields empty                                                                                      |
| 2   | Click Login without entering anything | Both the UserName and Password fields are highlighted as invalid (red border); no error message appears; the page stays on /login |

**Notes**
This is the only case that shows both fields marked at once, which is what demonstrates the check
is per-field rather than form-wide. (Automation: both inputs carry `is-invalid`; no request is
sent.)

---

### TC: Submit the form with whitespace-only credentials

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| ID             | LOGIN-FORM-004                                                      |
| Condition      | COND-LOGIN-FORM-004                                                 |
| Risk           | —                                                                   |
| Preconditions  | Browser is signed out (fresh context)                               |
| Test data      | userName: three space characters / password: three space characters |
| Postconditions | None — no account is created; the attempt is rejected by the server |
| Automation     | Not automated                                                       |

**Steps & expected results**

| #   | Action                                   | Expected result                                                                                                        |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                       | Login form is visible                                                                                                  |
| 2   | Enter three spaces in the UserName field | The field accepts the spaces                                                                                           |
| 3   | Enter three spaces in the Password field | The password is masked                                                                                                 |
| 4   | Click Login                              | Neither field is highlighted as invalid; the message "Invalid username or password!" appears; the page stays on /login |

**Notes**
Whitespace is treated as a value, not as an empty field — contrast with LOGIN-FORM-003, where the
same form blocks submission entirely. The required check draws its line between zero characters and
one. (Automation: no `is-invalid` on either input; a request _is_ sent.)

---

### TC: Submit the form with very long credentials

| Field          | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| ID             | LOGIN-FORM-005                                                            |
| Condition      | COND-LOGIN-FORM-005                                                       |
| Risk           | —                                                                         |
| Preconditions  | Browser is signed out (fresh context)                                     |
| Test data      | userName: 10,000 repetitions of "q" / password: 10,000 repetitions of "q" |
| Postconditions | None — no account is created; the attempt is rejected by the server       |
| Automation     | Not automated                                                             |

**Steps & expected results**

| #   | Action                                              | Expected result                                                                                            |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                                  | Login form is visible                                                                                      |
| 2   | Paste 10,000 "q" characters into the UserName field | The field accepts the paste; the text scrolls beyond the visible width and no truncation or error is shown |
| 3   | Paste 10,000 "q" characters into the Password field | The password is masked                                                                                     |
| 4   | Click Login                                         | The message "Invalid username or password!" appears; the page stays on /login; no browser error occurs     |

**Notes**
There is no maximum length to test against — the field declares no `maxlength` and the server
accepts values up to at least 50,000 characters. This case covers "long input is handled intact",
not a boundary. Step 2 is deliberately qualitative because a manual tester cannot count 10,000
characters. (Automation: assert the field's value length is exactly 10,000 before and after
submitting — that is the precise form of "nothing is truncated".)

---

### TC: Submit the form with special characters in the credentials

| Field          | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| ID             | LOGIN-FORM-006                                                      |
| Condition      | COND-LOGIN-FORM-006                                                 |
| Risk           | —                                                                   |
| Preconditions  | Browser is signed out (fresh context)                               |
| Test data      | userName: `<script>'"&;--` / password: `!@#$%^&*()_+{}\|:"<>?`      |
| Postconditions | None — no account is created; the attempt is rejected by the server |
| Automation     | Not automated                                                       |

**Steps & expected results**

| #   | Action                                              | Expected result                                                                                                            |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                                  | Login form is visible                                                                                                      |
| 2   | Enter `<script>'"&;--` in the UserName field        | The field holds the characters exactly as typed                                                                            |
| 3   | Enter `!@#$%^&*()_+{}\|:"<>?` in the Password field | The password is masked                                                                                                     |
| 4   | Click Login                                         | The message "Invalid username or password!" appears; the page stays on /login; no script executes and no page error occurs |

**Notes**
Functional only — this checks the form does not corrupt or choke on these characters, not whether
the server is injectable. Security testing is out of scope (`docs/test-plan.md` §2).

---

### TC: Log in with a correct username and password

| Field          | Value                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| ID             | LOGIN-FORM-007                                                                                          |
| Condition      | COND-LOGIN-FORM-007                                                                                     |
| Risk           | Risk-1                                                                                                  |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); browser is signed out (fresh context)     |
| Test data      | userName: "qa_login_ok_001" / password: "Aa1!aaaaaaaa" (valid complexity: upper, lower, digit, special) |
| Postconditions | User signed out; account "qa_login_ok_001" deleted via DELETE /Account/v1/User/{userId}                 |
| Automation     | Not automated                                                                                           |

**Steps & expected results**

| #   | Action                                        | Expected result                                                                                                  |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                            | Login form is visible with UserName field, Password field, Login and New User buttons                            |
| 2   | Enter "qa_login_ok_001" in the UserName field | The typed username appears in the field                                                                          |
| 3   | Enter "Aa1!aaaaaaaa" in the Password field    | The password is masked                                                                                           |
| 4   | Click Login                                   | The page navigates to /profile; the username is displayed; a Log out button is present; no error message appears |

**Notes**
The most important case in this file — if it fails, no authenticated journey is reachable. The
account is seeded through the API, but the session must be established through this form: DemoQA
holds it in React memory only, so it cannot be injected.

---

### TC: Log in with a username that does not exist

| Field          | Value                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| ID             | LOGIN-FORM-008                                                          |
| Condition      | COND-LOGIN-FORM-008                                                     |
| Risk           | Risk-4                                                                  |
| Preconditions  | Browser is signed out (fresh context); no account exists with this name |
| Test data      | userName: "qa_nonexistent_001" / password: "Aa1!aaaaaaaa"               |
| Postconditions | None — no account is created                                            |
| Automation     | Not automated                                                           |

**Steps & expected results**

| #   | Action                                           | Expected result                                                                                                                       |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                               | Login form is visible                                                                                                                 |
| 2   | Enter "qa_nonexistent_001" in the UserName field | The typed username appears in the field                                                                                               |
| 3   | Enter "Aa1!aaaaaaaa" in the Password field       | The password is masked                                                                                                                |
| 4   | Click Login                                      | The message "Invalid username or password!" appears above the form; the page stays on /login; neither field is highlighted as invalid |

**Notes**
Use a random suffix on the username in the automated version so the account genuinely does not
exist on the shared backend.

---

### TC: Log in with the wrong password for an existing account

| Field          | Value                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------- |
| ID             | LOGIN-FORM-009                                                                                      |
| Condition      | COND-LOGIN-FORM-009                                                                                 |
| Risk           | Risk-1, Risk-4                                                                                      |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); browser is signed out (fresh context) |
| Test data      | userName: "qa_login_wrongpw_001" / password: "WrongPass1!" (not the account's password)             |
| Postconditions | Account "qa_login_wrongpw_001" deleted via DELETE /Account/v1/User/{userId}                         |
| Automation     | Not automated                                                                                       |

**Steps & expected results**

| #   | Action                                             | Expected result                                                                                                                               |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                                 | Login form is visible                                                                                                                         |
| 2   | Enter "qa_login_wrongpw_001" in the UserName field | The typed username appears in the field                                                                                                       |
| 3   | Enter "WrongPass1!" in the Password field          | The password is masked                                                                                                                        |
| 4   | Click Login                                        | The message "Invalid username or password!" appears — character-for-character identical to LOGIN-FORM-008's message; the page stays on /login |

**Notes**
The point of this case is the comparison with LOGIN-FORM-008: a wrong password and an unknown
username must be indistinguishable, so the form does not disclose which accounts exist. Neither
case demonstrates this alone. A future change to a more helpful message would regress a real
security property.

---

### TC: Correct a rejected attempt without retyping

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| ID             | LOGIN-FORM-010                                        |
| Condition      | COND-LOGIN-FORM-010                                   |
| Risk           | —                                                     |
| Preconditions  | Browser is signed out (fresh context)                 |
| Test data      | userName: "qa_retained_001" / password: "WrongPass1!" |
| Postconditions | None — no account is created                          |
| Automation     | Not automated                                         |

**Steps & expected results**

| #   | Action                                                      | Expected result                                                                                          |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                                          | Login form is visible                                                                                    |
| 2   | Enter "qa_retained_001" and "WrongPass1!", then click Login | The message "Invalid username or password!" appears                                                      |
| 3   | Observe both fields                                         | The UserName field still reads "qa_retained_001" and the Password field still holds the entered password |

**Notes**
Step 2 combines entry and submission deliberately — the subject of this case is what survives the
rejection, not the act of entering. The values must persist so the user can amend one field rather
than start again.

---

### TC: Password stays hidden after a rejected attempt

| Field          | Value                                               |
| -------------- | --------------------------------------------------- |
| ID             | LOGIN-FORM-011                                      |
| Condition      | COND-LOGIN-FORM-011                                 |
| Risk           | —                                                   |
| Preconditions  | Browser is signed out (fresh context)               |
| Test data      | userName: "qa_masked_001" / password: "WrongPass1!" |
| Postconditions | None — no account is created                        |
| Automation     | Not automated                                       |

**Steps & expected results**

| #   | Action                                                    | Expected result                                                          |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Navigate to /login                                        | Login form is visible                                                    |
| 2   | Enter "qa_masked_001" and "WrongPass1!", then click Login | The message "Invalid username or password!" appears                      |
| 3   | Observe the Password field                                | The password is still shown as dots or asterisks, never as readable text |

**Notes**
A failed attempt must not expose the typed password to anyone looking at the screen. There is no
show/hide control on this form. (Automation: the Password input retains `type="password"`.)

---

### TC: Submit the form using the Enter key

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| ID             | LOGIN-FORM-012                                        |
| Condition      | COND-LOGIN-FORM-012                                   |
| Risk           | —                                                     |
| Preconditions  | Browser is signed out (fresh context)                 |
| Test data      | userName: "qa_keyboard_001" / password: "WrongPass1!" |
| Postconditions | None — no account is created                          |
| Automation     | Not automated                                         |

**Steps & expected results**

| #   | Action                                           | Expected result                                                          |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | Navigate to /login                               | Login form is visible                                                    |
| 2   | Enter "qa_keyboard_001" in the UserName field    | The typed username appears in the field                                  |
| 3   | Enter "WrongPass1!" in the Password field        | The password is masked                                                   |
| 4   | Press Enter while focus is in the Password field | The form submits and the message "Invalid username or password!" appears |

**Notes**
The form must be completable without a pointer. The automated version must use a real key press,
not a dispatched keyboard event — a synthetic event proves less than it appears to.

---

### TC: Open the login page while already signed in

| Field          | Value                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| ID             | LOGIN-FORM-013                                                                                       |
| Condition      | COND-LOGIN-FORM-013                                                                                  |
| Risk           | Risk-1, Risk-2                                                                                       |
| Preconditions  | User account exists (created via API: POST /Account/v1/User) and is signed in through the login form |
| Test data      | userName: "qa_already_in_001" / password: "Aa1!aaaaaaaa"                                             |
| Postconditions | User signed out; account "qa_already_in_001" deleted via DELETE /Account/v1/User/{userId}            |
| Automation     | Not automated                                                                                        |

**Steps & expected results**

| #   | Action                 | Expected result                                                                                                                        |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login     | No login form is shown; the page reads "You are already logged in. View your profile." with a Log out button and a link to the profile |
| 2   | Click the profile link | The page navigates to /profile and shows the signed-in user's details                                                                  |

**Notes**
This is the isolation hazard behind the signed-out precondition on every other case in this file:
a session left open by an earlier test makes the form disappear, and the resulting failure names a
missing locator rather than the real cause. The session cannot be cleared through storage — only a
fresh browser context or the Log out control ends it.

---

### TC: Reach registration from the login form

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| ID             | LOGIN-FORM-014                        |
| Condition      | COND-LOGIN-FORM-014                   |
| Risk           | —                                     |
| Preconditions  | Browser is signed out (fresh context) |
| Test data      | None                                  |
| Postconditions | None                                  |
| Automation     | Not automated                         |

**Steps & expected results**

| #   | Action             | Expected result                                                    |
| --- | ------------------ | ------------------------------------------------------------------ |
| 1   | Navigate to /login | Login form is visible with a New User button                       |
| 2   | Click New User     | The page navigates to /register and the registration form is shown |

**Notes**
Covers arrival only. The registration form's own behavior is out of scope, and `/register` is
CAPTCHA-gated, so nothing beyond reaching the page can be checked.

---

### TC: Identify the form fields by their labels

| Field          | Value                                 |
| -------------- | ------------------------------------- |
| ID             | LOGIN-FORM-015                        |
| Condition      | COND-LOGIN-FORM-015                   |
| Risk           | —                                     |
| Preconditions  | Browser is signed out (fresh context) |
| Test data      | None                                  |
| Postconditions | None                                  |
| Automation     | Not automated                         |

**Steps & expected results**

| #   | Action                       | Expected result                                                                              |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login           | Login form is visible                                                                        |
| 2   | Observe the two input fields | One is labelled "UserName :" and the other "Password :", each label sitting beside its field |

**Notes**
Low priority as a user-facing behavior, but it is the property that lets every other test here
address the fields by role and label rather than by CSS selector. If it regressed, the rest of the
suite would break first and more loudly. (Automation: `getByRole('textbox', { name: 'UserName' })`
and the same for Password resolve.)

---

### TC: See why a login attempt was rejected

| Field          | Value                                               |
| -------------- | --------------------------------------------------- |
| ID             | LOGIN-FORM-016                                      |
| Condition      | COND-LOGIN-FORM-016                                 |
| Risk           | —                                                   |
| Preconditions  | Browser is signed out (fresh context)               |
| Test data      | userName: "qa_errmsg_001" / password: "WrongPass1!" |
| Postconditions | None — no account is created                        |
| Automation     | Not automated                                       |

**Steps & expected results**

| #   | Action                                                    | Expected result                                                                              |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Navigate to /login                                        | Login form is visible                                                                        |
| 2   | Enter "qa_errmsg_001" and "WrongPass1!", then click Login | The text "Invalid username or password!" appears as a readable message above the form fields |

**Notes**
Unlike the blank-field marking, this message is real text in the page and can be located by its
content. Whether a screen reader _announces_ it on appearance was not checked — there is no
`role="alert"` or live region — but announcement is an accessibility concern excluded from scope
(`docs/test-plan.md` §2). This case covers the message being present and readable.
