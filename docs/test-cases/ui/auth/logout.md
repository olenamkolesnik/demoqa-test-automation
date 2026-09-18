# Test Cases — Logout / Session Termination

Derived from `docs/test-conditions/ui/auth/logout.md`. One test case per condition; each traces back by ID.

**Every test case in this file requires a signed-in browser context to begin with**, and ends signed out. The session is carried in four cookies (`token`, `expires`, `userID`, `userName`), so a fresh browser context is signed out by construction — see the constraint section in `docs/ui-spec/login-form.requirements.md`.

**Two accessible names exist for one control.** `/profile` renders `Logout` (one word); `/books` and `/login`'s already-signed-in state render `Log out` (two words). (Page attribution corrected 2026-09-18 after the stage-6 live check.) This is a recorded defect (DIVERGENCE-1, disposition _do not automate_) — the cases below locate the control **per page** and never assert which name appears.

**The two infeasible conditions — `COND-LOGOUT-INF-001` (the two-name defect) and `COND-LOGOUT-INF-003` (double logout) — deliberately have no test case here.**

---

### TC: Log out from the profile page

| Field          | Value                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-001                                                                                                          |
| Condition      | COND-LOGOUT-001                                                                                                     |
| Risk           | Risk-1, Risk-2                                                                                                      |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); user is signed in through the login form, on /profile |
| Test data      | userName: "qa_logout_001" / password: "Aa1!aaaaaaaa" (valid complexity: upper, lower, digit, special)               |
| Postconditions | User signed out; account "qa_logout_001" deleted via DELETE /Account/v1/User/{userId}                               |
| Automation     | Not automated                                                                                                       |

**Steps & expected results**

| #   | Action                  | Expected result                                                                                                        |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Observe the page header | The username "qa_logout_001" is displayed, with a Logout button beside it                                              |
| 2   | Click Logout            | The page navigates to https://demoqa.com/login                                                                         |
| 3   | Observe the page        | The login form is shown — UserName field, Password field, Login and New User buttons; no username and no Logout button |

**Notes**
The most important case in this file — if it fails, no signed-out state is reachable through the UI at all. Step 3 checks all three effects of the one click (the redirect, the cleared identity, the restored form) because they are not separately triggerable; the condition merges four requirements for the same reason.

On /profile the Logout button shares `id="submit"` with Delete Account and Delete All Books, so it must be identified by its visible label, not by that id. (Automation: locate by role and accessible name.)

---

### TC: Log out from the book store page

| Field          | Value                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-002                                                                                                        |
| Condition      | COND-LOGOUT-002                                                                                                   |
| Risk           | Risk-1, Risk-2                                                                                                    |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); user is signed in through the login form, on /books |
| Test data      | userName: "qa_logout_002" / password: "Aa1!aaaaaaaa"                                                              |
| Postconditions | User signed out; account "qa_logout_002" deleted via DELETE /Account/v1/User/{userId}                             |
| Automation     | Not automated                                                                                                     |

**Steps & expected results**

| #   | Action             | Expected result                                                                                 |
| --- | ------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | Navigate to /books | The book catalogue is shown with the username "qa_logout_002" and a **Log out** button above it |
| 2   | Click Log out      | The page navigates to https://demoqa.com/login                                                  |
| 3   | Observe the page   | The login form is shown; no username and no logout control                                      |

**Notes**
Not a duplicate of LOGOUT-001: that case covers the logout transition, this one covers the claim that the control is offered on _every_ page showing the signed-in header, not only the profile page. `/books` is currently the only second such page, so this case is the whole of the evidence for that claim.

**The button here reads "Log out" — two words — not "Logout" as on the profile page.** Corrected 2026-09-18: the earlier wording copied the profile page's label onto a page it had never been observed on. A tester looking for "Logout" on /books will not find it.

---

### TC: Verify session cookies are cleared by logout

| Field          | Value                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-003                                                                                                          |
| Condition      | COND-LOGOUT-003                                                                                                     |
| Risk           | Risk-1, Risk-2                                                                                                      |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); user is signed in through the login form, on /profile |
| Test data      | userName: "qa_logout_003" / password: "Aa1!aaaaaaaa"                                                                |
| Postconditions | User signed out; account "qa_logout_003" deleted via DELETE /Account/v1/User/{userId}                               |
| Automation     | Not automated                                                                                                       |

**Steps & expected results**

| #   | Action                                                                                            | Expected result                                                    |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Open the browser's developer tools and inspect the cookies for demoqa.com (Application → Cookies) | Four cookies are present: `token`, `expires`, `userID`, `userName` |
| 2   | Click Logout                                                                                      | The page navigates to https://demoqa.com/login                     |
| 3   | Inspect the cookies for demoqa.com again                                                          | None of `token`, `expires`, `userID` or `userName` is present      |

**Notes**
The one case in this file that checks browser state rather than what is on screen — which is what makes it worth having alongside LOGOUT-001, since the interface could re-render correctly while a cookie lingered.

It matters on security grounds, not just correctness: the `token` cookie is a JWT whose payload contains the account **password in cleartext**, and it is readable by any script on the page (`httpOnly` is not set). A logout that left it behind would strand live credentials in the browser.

---

### TC: End a session by clearing its cookies

| Field          | Value                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-004                                                                                                          |
| Condition      | COND-LOGOUT-004                                                                                                     |
| Risk           | Risk-1, Risk-2                                                                                                      |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); user is signed in through the login form, on /profile |
| Test data      | userName: "qa_logout_004" / password: "Aa1!aaaaaaaa"                                                                |
| Postconditions | User signed out; account "qa_logout_004" deleted via DELETE /Account/v1/User/{userId}                               |
| Automation     | Not automated                                                                                                       |

**Steps & expected results**

| #   | Action                                                                            | Expected result                                                                                                              |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Delete all demoqa.com cookies in developer tools, without using the Logout button | The cookies are removed                                                                                                      |
| 2   | Reload /profile                                                                   | The signed-out message is shown — "Currently you are not logged into the Book Store application..."; no username, no buttons |

**Notes**
Establishes that the cookies _are_ the session rather than a reflection of it — clearing them out of band signs the user out without the logout control being used.

Worth testing because it underwrites a test-infrastructure assumption, not only a user-facing behavior: it is why a fresh browser context is reliably signed out, and why cookie/`storageState` seeding is viable for other suites. If it stops holding, the isolation assumption behind every UI test in the project stops holding too. See **Security constraint on any cookie-based seeding** in `docs/ui-spec/login-form.requirements.md` before building a fixture that seeds a signed-in state this way.

---

### TC: Press the browser Back button after logging out

| Field          | Value                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-005                                                                                                          |
| Condition      | COND-LOGOUT-005                                                                                                     |
| Risk           | Risk-1, Risk-2, Risk-3                                                                                              |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); user is signed in through the login form, on /profile |
| Test data      | userName: "qa_logout_005" / password: "Aa1!aaaaaaaa"                                                                |
| Postconditions | User signed out; account "qa_logout_005" deleted via DELETE /Account/v1/User/{userId}                               |
| Automation     | Not automated                                                                                                       |

**Steps & expected results**

| #   | Action                                                    | Expected result                                                                                                     |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Click Logout                                              | The page navigates to https://demoqa.com/login                                                                      |
| 2   | Press the browser's Back button until /profile is reached | The URL is /profile                                                                                                 |
| 3   | Observe the page                                          | The signed-out message is shown; the username "qa_logout_005" is **not** displayed, and no Logout button is present |

**Notes**
Security-adjacent and cheap to check: a page restored from the browser's back/forward cache showing the previous user's profile is the classic failure here, and it regresses silently because nothing else about the application changes. Observed 2026-09-18 to re-render correctly rather than restore from cache.

Step 2 says "until /profile is reached" rather than "press Back once" deliberately — the number of history entries between /login and /profile is not guaranteed, so a fixed count would be brittle. Risk-3 applies for the same reason.

---

### TC: Confirm no logout control is offered without a session

| Field          | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| ID             | LOGOUT-006                                                               |
| Condition      | COND-LOGOUT-010                                                          |
| Risk           | —                                                                        |
| Preconditions  | Browser is signed out (fresh context, or all demoqa.com cookies cleared) |
| Test data      | None — no account is required                                            |
| Postconditions | None — nothing is created                                                |
| Automation     | Not automated                                                            |

**Steps & expected results**

| #   | Action               | Expected result                                                                                        |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Navigate to /profile | The signed-out message is shown; no buttons of any kind are present                                    |
| 2   | Navigate to /books   | The book catalogue is shown with a Login button where the username and Log out button would be         |
| 3   | Navigate to /login   | The login form is shown — UserName field, Password field, Login and New User buttons; no Logout button |

**Notes**
The negative counterpart to LOGOUT-001. The three pages are checked in one case because they are one situation — "no session, therefore no control" — sampled at the three places it could fail, not three separate behaviors.

This also settles the "log out with no active session" edge case: there is no control to activate, so the situation is unreachable rather than untested.

The only case in this file needing no account and no cleanup, since it never signs in.

---

### TC: Open the profile page without a session

| Field          | Value                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-007                                                                                          |
| Condition      | COND-LOGOUT-011                                                                                     |
| Risk           | Risk-1, Risk-2                                                                                      |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); browser is signed out (fresh context) |
| Test data      | userName: "qa_logout_007" / password: "Aa1!aaaaaaaa"                                                |
| Postconditions | Account "qa_logout_007" deleted via DELETE /Account/v1/User/{userId}                                |
| Automation     | Not automated                                                                                       |

**Steps & expected results**

| #   | Action                                                                             | Expected result                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Navigate directly to /profile without signing in                                   | The URL stays /profile — the page does **not** redirect. The message "Currently you are not logged into the Book Store application, please visit the login page to enter or register page to register yourself." is shown, with links to the login and register pages |
| 2   | Observe the page                                                                   | No username, no book collection table, and no buttons of any kind                                                                                                                                                                                                     |
| 3   | Sign in through the login form, then click Logout, then navigate to /profile again | The same signed-out message is shown, identical to step 1                                                                                                                                                                                                             |

**Notes**
The actual access-control check in this feature — logout only means something if what it protected is genuinely unreachable afterwards.

**The page does not redirect.** A tester (or an automated test) waiting for a navigation away from /profile will wait forever against correct behavior: the assertion is on the content, not on the URL changing.

Step 3 deliberately chains three actions rather than splitting them, against the usual one-action-per-step rule: steps 1-2 have already established the signed-out profile state, and splitting step 3 would re-assert that unchanged state twice over as noise. Reviewed and signed off 2026-09-18 as a conscious exception.

Step 3 covers the just-logged-out path as well as the never-signed-in one. The two were observed to give identical results, so they are one case rather than two — but the account and sign-in are needed only for that step, which is why this case seeds an account while LOGOUT-006 does not.

---

### TC: Browse the book catalogue after logging out

| Field          | Value                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-008                                                                                                        |
| Condition      | COND-LOGOUT-012                                                                                                   |
| Risk           | Risk-1, Risk-2                                                                                                    |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); user is signed in through the login form, on /books |
| Test data      | userName: "qa_logout_008" / password: "Aa1!aaaaaaaa"                                                              |
| Postconditions | User signed out; account "qa_logout_008" deleted via DELETE /Account/v1/User/{userId}                             |
| Automation     | Not automated                                                                                                     |

**Steps & expected results**

| #   | Action                                   | Expected result                                                                                                                                                          |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Observe the catalogue while signed in    | 8 books are listed with columns Image, Title, Author, Publisher; the "Type to search" box is present; the header shows the username "qa_logout_008" and a Log out button |
| 2   | Click Log out, then navigate to /books   | The catalogue still lists the same 8 books and the "Type to search" box is still present                                                                                 |
| 3   | Observe the table columns and the header | The columns are unchanged — Image, Title, Author, Publisher — and a Login button now stands where the username and Log out button were                                   |

**Notes**
Marks the boundary of what logging out withdraws: the catalogue is public and stays readable, while the per-row collection controls go with the session.

The header block is what changes, and the table is what does not — which is why step 1 records the signed-in state first: the assertion is about the contrast, and without the before-state step 3 would just be describing a page.

**Corrected 2026-09-18 (stage 6).** An earlier version of this case had the table gaining and losing an **Action** column. There is no Action column on /books in either state — it belongs to the profile page's collection table, and the claim came from a profile-page snapshot misidentified as /books. The columns are identical signed in and signed out; a tester who expected them to change would have marked correct behavior as a failure.

---

### TC: Confirm logout contacts no server

| Field          | Value                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| ID             | LOGOUT-009                                                                                                          |
| Condition      | COND-LOGOUT-013                                                                                                     |
| Risk           | Risk-1, Risk-2                                                                                                      |
| Preconditions  | User account exists (created via API: POST /Account/v1/User); user is signed in through the login form, on /profile |
| Test data      | userName: "qa_logout_009" / password: "Aa1!aaaaaaaa"                                                                |
| Postconditions | User signed out; account "qa_logout_009" deleted via DELETE /Account/v1/User/{userId}                               |
| Automation     | Not automated                                                                                                       |

**Steps & expected results**

| #   | Action                                                                             | Expected result                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the Network tab in developer tools and filter requests to the demoqa.com host | The filter is active                                                                                                                                                            |
| 2   | Click Logout                                                                       | The page navigates to https://demoqa.com/login                                                                                                                                  |
| 3   | Inspect the captured requests                                                      | **No** request to demoqa.com was made — in particular none to /Account/ or /BookStore/. Requests to advertising and analytics hosts are expected and are not part of this check |

**Notes**
**Filter to the demoqa.com host before clicking.** The page loads advertising and analytics traffic continuously, so an unfiltered Network tab always shows requests and a check for "no requests at all" would fail against correct behavior. Observed 2026-09-18: six requests fired across a logout, every one third-party.

Confirms logout is entirely client-side — it deletes the cookies and re-renders, with no server involved. DemoQA exposes no logout endpoint for it to call.

Low value relative to the rest of the file: it covers _how_ logout works rather than _whether_ it does, and LOGOUT-001 already covers the outcome a user sees.

---

## Coverage

| Condition           | Test case                                     |
| ------------------- | --------------------------------------------- |
| COND-LOGOUT-001     | LOGOUT-001                                    |
| COND-LOGOUT-002     | LOGOUT-002                                    |
| COND-LOGOUT-003     | LOGOUT-003                                    |
| COND-LOGOUT-004     | LOGOUT-004                                    |
| COND-LOGOUT-005     | LOGOUT-005                                    |
| COND-LOGOUT-010     | LOGOUT-006                                    |
| COND-LOGOUT-011     | LOGOUT-007                                    |
| COND-LOGOUT-012     | LOGOUT-008                                    |
| COND-LOGOUT-013     | LOGOUT-009                                    |
| COND-LOGOUT-INF-001 | — (infeasible: DIVERGENCE-1, do not automate) |
| COND-LOGOUT-INF-003 | — (infeasible: no second activation exists)   |

All nine non-infeasible conditions have exactly one test case. The two infeasible conditions have none, deliberately.
