# Test Conditions — Logout / Session Termination

Derived from `docs/ui-spec/logout.requirements.md`. One condition per situation worth testing; test cases are generated from these downstream and link back by ID.

---

## Feature analysis

**Feature:** logout / session termination — the `Logout` control in the signed-in header block on `/profile`, the `Log out` control on `/books` and in `/login`'s already-signed-in state, and the state the application presents once a session ends.
**Source:** `docs/ui-spec/logout.requirements.md` (observations 2026-09-08, 2026-09-10, 2026-09-11, 2026-09-14, and two live passes on 2026-09-18)
**Test level:** System-level, black-box, per `docs/test-plan.md` §4

**Happy path**

- Activating the logout control from a signed-in page ends the session, returns the user to `/login`, removes the displayed identity, and restores the working sign-in form (REQ-LOGOUT-010, -011, -012, -013)

**Negative cases**

- No logout control is offered to a user without a session, on any page (REQ-LOGOUT-005)
- A protected page requested without a session serves no signed-in content and points the user at sign-in instead (REQ-LOGOUT-030, -031)
- Session cookies do not survive logout — no credential material is left behind (REQ-LOGOUT-021)

**Boundary cases**

- No numeric or length boundary exists in this feature: logout takes no input. The meaningful boundary is the **session/no-session** transition, covered under State transitions rather than BVA.
- The one genuine edge is a **second activation of a control that no longer exists** — the double-logout race (REQ-LOGOUT-010, observed benign)

**State transitions**

- Signed in + on a page with the header block → activate logout → signed out, on `/login` (REQ-LOGOUT-010, -011, -012, -013)
- Signed in → cookies cleared externally → signed out, without the control (REQ-LOGOUT-023)
- Signed out → request `/profile` → stays at `/profile`, signed-out message, **no redirect** (REQ-LOGOUT-030, -031)
- Signed out → browser Back to a pre-logout page → re-renders signed out, no stale content (REQ-LOGOUT-010 / edge case 4)
- Signed in vs. signed out → `/books` → catalogue readable either way, header block differs (REQ-LOGOUT-032)

**Requirements deliberately yielding no condition**

- **REQ-LOGOUT-003** (one consistent accessible name) — DIVERGENCE-1 disposition is _Defect, do not automate_. Recorded as `COND-LOGOUT-INF-001`. A condition asserting one shared name would fail; a condition asserting the two observed names would encode the defect as expected behavior. Neither is written.
- **REQ-LOGOUT-002** and **REQ-LOGOUT-004** are locator-strategy facts, not user-observable behavior — they constrain _how_ every condition below addresses the control rather than yielding a condition of their own. Both are cited as Source on `COND-LOGOUT-001`, which is the condition that fails first if either stops holding.

**Spec ambiguities / unknowns**

- None. REQ-LOGOUT-022 was the basis's last open review-gate item; the 2026-09-18 network capture closed it, and every requirement in the basis is now `observed`/high.
- The basis notes `/books` was observed signed-out only at page 1 of the catalogue; pagination behavior while signed out is not recorded. Out of scope here — it belongs to the book-catalogue feature, not to logout.

---

## State

### COND-LOGOUT-001: Logout from the profile page ends the session

| Field      | Value                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| ID         | COND-LOGOUT-001                                                                                |
| Priority   | High                                                                                           |
| Category   | State                                                                                          |
| Technique  | State transition                                                                               |
| Source     | REQ-LOGOUT-010, REQ-LOGOUT-011, REQ-LOGOUT-012, REQ-LOGOUT-013, REQ-LOGOUT-002, REQ-LOGOUT-004 |
| Test cases | LOGOUT-001                                                                                     |

**What to cover**
From `/profile` while signed in, activating the `Logout` control transitions the user to the signed-out state: the URL becomes `/login`, the displayed username is gone, and the sign-in form is present and usable again.

**Values / boundaries**

```
Signed in, on /profile → click button "Logout" → URL = https://demoqa.com/login
                                                → #userName-value absent
                                                → textbox "UserName" + textbox "Password" + button "Login" present
```

**Notes**
The single most important condition in this file — if it fails, no signed-out state is reachable through the UI at all. Four requirements are deliberately merged here rather than split: one click produces all four effects, so separating them would violate the no-trigger/effect-splitting rule (the redirect, the cleared identity, and the restored form are not independently exercisable). REQ-LOGOUT-002 and -004 are cited because this condition is also the first thing to fail if the control stops being reachable by role+name — on `/profile` it shares `id="submit"` with three other buttons, so role+name is the only viable strategy.

### COND-LOGOUT-002: Logout from the book store page ends the session

| Field      | Value                          |
| ---------- | ------------------------------ |
| ID         | COND-LOGOUT-002                |
| Priority   | Medium                         |
| Category   | State                          |
| Technique  | State transition               |
| Source     | REQ-LOGOUT-001, REQ-LOGOUT-010 |
| Test cases | LOGOUT-002                     |

**What to cover**
The logout control works from `/books` as well as `/profile` — a session can be ended from any page rendering the signed-in header block, not only from the profile page.

**Values / boundaries**

```
Signed in, on /books → click button "Log out" → URL = https://demoqa.com/login, signed out
                       (two words on this page — NOT "Logout" as on /profile; see COND-LOGOUT-INF-001)
```

**Notes**
Distinct from COND-LOGOUT-001, not a duplicate of it: -001 covers the transition itself, this one covers REQ-LOGOUT-001's claim that the control is offered on _every_ page with the header block. `/books` is the only second such page currently known, so it is the whole of the evidence for that claim. **The control is named `Log out` here, not `Logout`** — corrected 2026-09-18 after the stage-6 live check; the earlier wording copied `/profile`'s name onto a page it had never been observed on. Medium rather than High — if this fails but -001 passes, the user can still sign out by navigating to `/profile` first.

### COND-LOGOUT-003: Session cookies are cleared by logout

| Field      | Value                          |
| ---------- | ------------------------------ |
| ID         | COND-LOGOUT-003                |
| Priority   | High                           |
| Category   | State                          |
| Technique  | State transition               |
| Source     | REQ-LOGOUT-020, REQ-LOGOUT-021 |
| Test cases | LOGOUT-003                     |

**What to cover**
Logout removes every cookie carrying the session, leaving no credential material in the browser after the user signs out.

**Values / boundaries**

```
Signed in  → cookies token, expires, userID, userName all present
After logout → none of token, userID, userName, expires present
```

**Notes**
High priority on security grounds rather than functional ones: the `token` cookie is a JWT whose payload decodes to `{userName, password, iat}` — the account password **in cleartext** — and it is set `httpOnly: false`, so any script on the page can read it. A logout that left it behind would strand live credentials in the browser. This is the one condition in this file asserting on browser state rather than rendered content; that is deliberate and is what makes it independently valuable from COND-LOGOUT-001, which would still pass if the UI re-rendered correctly while a cookie lingered.

### COND-LOGOUT-004: A session ends when its cookies are cleared

| Field      | Value            |
| ---------- | ---------------- |
| ID         | COND-LOGOUT-004  |
| Priority   | Medium           |
| Category   | State            |
| Technique  | State transition |
| Source     | REQ-LOGOUT-023   |
| Test cases | LOGOUT-004       |

**What to cover**
The session is carried by the cookies rather than merely reflected in them: clearing them out-of-band returns the application to its signed-out state without the logout control being used.

**Values / boundaries**

```
Signed in → context.clearCookies() → /profile shows the signed-out message, no username, no buttons
```

**Notes**
Worth testing in its own right because it underwrites a test-infrastructure decision, not just a user-facing behavior: it is what makes a fresh browser context reliably signed out, and what makes cookie/`storageState` seeding viable for other suites. If this stops holding, the isolation assumption behind every UI test in the project stops holding with it. See **Security constraint on any cookie-based seeding** in `docs/ui-spec/login-form.requirements.md` before building any fixture that seeds a signed-in state this way.

### COND-LOGOUT-005: The browser Back button does not restore a signed-in view

| Field      | Value                          |
| ---------- | ------------------------------ |
| ID         | COND-LOGOUT-005                |
| Priority   | Medium                         |
| Category   | State                          |
| Technique  | State transition               |
| Source     | REQ-LOGOUT-010, REQ-LOGOUT-030 |
| Test cases | LOGOUT-005                     |

**What to cover**
After logging out, navigating back to a page that was displayed while signed in re-renders it in its signed-out form rather than restoring the cached signed-in content.

**Values / boundaries**

```
Signed in on /profile → logout → browser Back to /profile
  → signed-out message rendered, #userName-value absent, no buttons, auth cookies still absent
```

**Notes**
Security-adjacent and cheap to assert: a bfcache restore showing a previous user's profile is the classic failure here, and it regresses silently because nothing else about the app changes. Observed 2026-09-18 to re-render correctly. Independent of COND-LOGOUT-001 despite sharing its setup — it asserts what happens _after_ a completed logout, and would catch a regression that -001 passes straight through.

## Behavior

### COND-LOGOUT-010: No logout control is offered without a session

| Field      | Value                          |
| ---------- | ------------------------------ |
| ID         | COND-LOGOUT-010                |
| Priority   | Medium                         |
| Category   | Behavior                       |
| Technique  | EP                             |
| Source     | REQ-LOGOUT-005, REQ-LOGOUT-001 |
| Test cases | LOGOUT-006                     |

**What to cover**
A user without a session is offered no logout control on any page — the control and the signed-out state are mutually exclusive.

**Values / boundaries**

```
Signed out, /profile → no button of any kind rendered
Signed out, /books   → button "Login" in place of the header block; no logout control
Signed out, /login   → the sign-in form; no logout control
```

**Notes**
The negative equivalence class paired with COND-LOGOUT-001's positive one. Covers all three known page states in one condition rather than three, because they are one class ("no session ⇒ no control") observed at three sample points, not three independently meaningful situations. This also settles the "logout with no active session" edge case the basis flagged: it is unreachable by construction, so no separate condition is owed for it.

**Deliberate overlap with COND-LOGOUT-011.** The `/profile` sample point here is weaker than what -011 already asserts: -011 covers the full signed-out profile state including REQ-LOGOUT-030's stronger "no buttons whatsoever" fact, while this condition only asserts the absence of the logout control. The overlap is kept on purpose — it is what makes this condition a single-place statement of "no session ⇒ no control _anywhere_", which is the claim REQ-LOGOUT-005 actually makes, and it acts as a negative cross-check if -011's broader assertion is ever narrowed. Raised by the stage-3 review as a borderline call; retained with the redundancy documented rather than left to read as an oversight.

### COND-LOGOUT-011: A protected page serves no signed-in content without a session

| Field      | Value                          |
| ---------- | ------------------------------ |
| ID         | COND-LOGOUT-011                |
| Priority   | High                           |
| Category   | Behavior                       |
| Technique  | EP                             |
| Source     | REQ-LOGOUT-030, REQ-LOGOUT-031 |
| Test cases | LOGOUT-007                     |

**What to cover**
Requesting `/profile` directly without a session renders no signed-in content and directs the user toward signing in, whether the context never had a session or has just logged out.

**Values / boundaries**

```
Never signed in   → GET /profile → signed-out message, links to /login and /register
Just logged out   → GET /profile → identical result
Both cases        → URL stays /profile (no redirect); no username; no buttons
```

**Notes**
High priority: this is the actual access-control assertion in the feature — logout is only meaningful if what it protects is genuinely unreachable afterwards. **Assert on content, not on a URL change**: the page does not redirect, so a test waiting for a navigation away from `/profile` will time out on correct behavior. Both entry paths are one condition because they were observed to produce identical results; they are one class, not two.

### COND-LOGOUT-012: The book catalogue stays readable after logout

| Field      | Value           |
| ---------- | --------------- |
| ID         | COND-LOGOUT-012 |
| Priority   | Low             |
| Category   | Behavior        |
| Technique  | EP              |
| Source     | REQ-LOGOUT-032  |
| Test cases | LOGOUT-008      |

**What to cover**
Logging out does not withdraw access to the public book catalogue — `/books` still lists books and still offers search, while the signed-in header block (username + `Log out`) is withdrawn with the session and replaced by a `Login` button.

**Values / boundaries**

```
Signed in,  /books → 8 book rows; textbox "Type to search"; header shows username + button "Log out"
Signed out, /books → 8 book rows; textbox "Type to search"; header shows button "Login" instead
                   → table columns = Image, Title, Author, Publisher in BOTH states
```

**Notes**
Low priority: a negative-space assertion about a public page, and no user journey breaks if it regresses. Recorded because it is the boundary of what logout withdraws — the catalogue is deliberately outside it.

**Corrected 2026-09-18 (stage 6).** An earlier version named a disappearing **Action** column as the sharpest signal of that boundary. There is no Action column on `/books` in either state — it belongs to `/profile`'s collection table, and the claim came from a `/profile` snapshot misidentified as `/books`. The observable that logout changes on `/books` is the header block alone: username + `Log out` while signed in, a `Login` button when not. The table itself is identical in both states, which is precisely the point of this condition.

### COND-LOGOUT-013: Logout issues no request to the server

| Field      | Value           |
| ---------- | --------------- |
| ID         | COND-LOGOUT-013 |
| Priority   | Low             |
| Category   | Behavior        |
| Technique  | EP              |
| Source     | REQ-LOGOUT-022  |
| Test cases | LOGOUT-009      |

**What to cover**
Activating logout clears the session entirely client-side, without contacting the server — no request to any application endpoint is issued.

**Values / boundaries**

```
Signed in, on /profile → click button "Logout"
  → zero requests to demoqa.com (no /Account/, no /BookStore/)
  → the /login transition is an SPA route change, not a document fetch
```

**Notes**
Promoted from `COND-LOGOUT-INF-002` after the stage-3 review correctly judged the gap resolvable rather than infeasible: a network capture needs no new account beyond the session a test already establishes, so deferring it was a call not made rather than a genuine impossibility. Captured 2026-09-18 and reproduced — 6 requests per run, all third-party ad/analytics, zero first-party. REQ-LOGOUT-022 was upgraded `inferred`/medium → `observed`/high in the basis as a result, closing its last open review-gate item.

Low priority: it concerns _how_ logout takes effect rather than _whether_ it does, and COND-LOGOUT-001 already covers the user-visible outcome. **Assert on first-party requests only** — the page loads advertisement and analytics traffic continuously, so a test asserting zero requests of any kind would fail against correct behavior.

---

## Infeasible conditions

### COND-LOGOUT-INF-001: The logout control has one consistent accessible name (infeasible)

| Field      | Value                        |
| ---------- | ---------------------------- |
| ID         | COND-LOGOUT-INF-001          |
| Priority   | Low                          |
| Category   | Behavior                     |
| Technique  | EP                           |
| Source     | REQ-LOGOUT-003, DIVERGENCE-1 |
| Test cases | —                            |

**What to cover**
That the logout control presents the same accessible name everywhere it appears, so it is recognisable as one control and addressable by one locator.

**Why infeasible**
It does not. `/profile` renders `button "Logout"` (one word); `/books` and `/login`'s already-signed-in state both render `button "Log out"` (two words). The `/profile` and `/login` variants were captured in snapshots minutes apart on 2026-09-14; the `/books` variant was confirmed live on 2026-09-18 with its raw HTML. This is a concurrent inconsistency, not a change over time. (Page attribution corrected 2026-09-18 — an earlier version placed `/books` with `/profile`; the split is `/profile` vs. everything else.) DIVERGENCE-1's disposition is **Defect — do not automate**: asserting the requirement would produce a permanently failing test, and asserting the observed two-name reality would encode a defect as expected behavior. Neither belongs in the suite.

**Mitigation**
Test design honours the observed behavior without asserting it: every condition in this file locates the control **per page**, never through one shared locator. The two page objects already hold two separate locators for what a user would call one button ([`profile.page.ts:25`](../../../../src/ui/pages/profile.page.ts#L25), [`login.page.ts:26`](../../../../src/ui/pages/login.page.ts#L26)). Any page object for a new signed-in page must check which name that page renders rather than assuming either. Revisit if the SUT ever unifies the two.

_`COND-LOGOUT-INF-002` (logout takes effect without a server round trip) was **promoted to `COND-LOGOUT-013`** on 2026-09-18 after the network capture it was waiting on was taken. The ID is retired rather than reused, so an earlier reference to it resolves here._

### COND-LOGOUT-INF-003: A second logout activation is rejected (infeasible)

| Field      | Value                          |
| ---------- | ------------------------------ |
| ID         | COND-LOGOUT-INF-003            |
| Priority   | Low                            |
| Category   | State                          |
| Technique  | State transition               |
| Source     | REQ-LOGOUT-010, REQ-LOGOUT-005 |
| Test cases | —                              |

**What to cover**
That activating logout twice in rapid succession is handled safely — the second activation neither errors, nor re-issues work, nor leaves the session in an inconsistent state.

**Why infeasible**
There is no second activation to observe. Live attempt 2026-09-18: two rapid clicks were dispatched; the first succeeded and the second failed to find its target because the control **unmounts** with the signed-in header block. The run ended signed out on `/login` with cookies cleared — the correct outcome. A test here would assert a non-event (that nothing bad happened when a button that no longer exists was not clicked), which is not a meaningful oracle.

**Mitigation**
Recorded as a property of the SUT rather than a condition. Note the contrast with the login form, where DIVERGENCE-5 records three rapid clicks producing three authentication requests — logout is protected by unmounting where login is not, so the login-side weakness must not be generalised to here. Revisit if logout ever gains an in-flight state that keeps the control mounted.

---

## Coverage completeness check

| Question                                                                               | Answer                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does every required input field have a valid EP condition?                             | Not applicable — logout takes no input                                                                                                                                                         |
| Does every required input field have at least one invalid EP condition?                | Not applicable — logout takes no input                                                                                                                                                         |
| Are all BVA boundaries covered (min, min-1, empty)?                                    | Not applicable — no numeric or length rule exists. The session/no-session transition is covered under State.                                                                                   |
| Does every authorization state produce a distinct condition?                           | Not applicable — a UI feature has no token to vary. Session state is the UI equivalent, covered under State transitions: signed in (COND-LOGOUT-001, -002), signed out (COND-LOGOUT-010, -011) |
| Are all infeasible conditions documented?                                              | Yes — INF-001 (divergence) and INF-003 (unreachable state). INF-002 was promoted to COND-LOGOUT-013 once verified                                                                              |
| Does every analysis bullet map to at least one condition?                              | Yes                                                                                                                                                                                            |
| Does every item in the test basis map to a condition or a documented infeasible entry? | Yes — all 16 REQ ids accounted for; verified by the mechanical diff below                                                                                                                      |
| Are all conditions independently testable?                                             | Yes — each establishes its own session and asserts its own end state; none depends on another's outcome                                                                                        |
| Does any condition pair only ever get exercised together (trigger vs. its own effect)? | No — REQ-LOGOUT-010/-011/-012/-013 were merged into COND-LOGOUT-001 precisely to avoid this                                                                                                    |

**Basis coverage — mechanical check**

All 16 `REQ-LOGOUT-*` ids in the basis appear in this file:

| REQ                              | Where                                               |
| -------------------------------- | --------------------------------------------------- |
| REQ-LOGOUT-001                   | COND-LOGOUT-002, COND-LOGOUT-010                    |
| REQ-LOGOUT-002                   | COND-LOGOUT-001 (locator-strategy constraint)       |
| REQ-LOGOUT-003                   | COND-LOGOUT-INF-001 (DIVERGENCE-1, do not automate) |
| REQ-LOGOUT-004                   | COND-LOGOUT-001 (locator-strategy constraint)       |
| REQ-LOGOUT-005                   | COND-LOGOUT-010, COND-LOGOUT-INF-003                |
| REQ-LOGOUT-010, -011, -012, -013 | COND-LOGOUT-001 (merged), also -002, -005, INF-003  |
| REQ-LOGOUT-020, -021             | COND-LOGOUT-003                                     |
| REQ-LOGOUT-022                   | COND-LOGOUT-013 (verified by network capture)       |
| REQ-LOGOUT-023                   | COND-LOGOUT-004                                     |
| REQ-LOGOUT-030, -031             | COND-LOGOUT-011, also -005 (Back-button case)       |
| REQ-LOGOUT-032                   | COND-LOGOUT-012                                     |

**Coverage gaps identified**

- None. The basis's last open review-gate item (REQ-LOGOUT-022) was resolved during this pass rather than deferred — see `COND-LOGOUT-013`.

**Deferred conditions**

- None outstanding. `COND-LOGOUT-INF-002` was the only deferred item and was promoted to `COND-LOGOUT-013` within this pass.
- `/books` pagination while signed out was not observed. Out of scope for logout; belongs to the book-catalogue feature's own basis.
