---
name: review-test-cases
description: Reviews an already-written manual test cases file against the rules defined in write-manual-test-case — field completeness, traceability to conditions, concrete test data, and anti-patterns. Use this to verify a test cases file before automation, or to re-check one written or edited outside this workflow.
---

## Purpose

This skill does not define its own review criteria. It applies the rules already documented in `.claude/skills/write-manual-test-case/SKILL.md` — **Field guidance**, the **Test case format**, and **What NOT to write** — to a specific, already-written test cases file. One source of truth for what "correct" looks like; this skill is enforcement, not a second definition.

Read `.claude/skills/write-manual-test-case/SKILL.md` in full before reviewing anything.

---

## Input

The target test cases file, e.g. `docs/test-cases/api/auth/post-user.md`. If not given explicitly, ask which file to review — do not guess.

If the corresponding conditions file (`docs/test-conditions/api/<feature>/<verb>-<resource>.md`) is available, read it too — traceability checks require comparing both files, not just inspecting the test cases file in isolation.

---

## What to check

Go through the target file, test case by test case:

1. **Traceability** — every test case has a non-empty `Condition` field referencing a real condition ID; every condition in the paired conditions file (if available) that isn't marked `Infeasible` has at least one test case pointing back to it, and every BVA boundary/value listed in a condition's `Values / boundaries` has its own test case
2. **ID** — follows `AREA-NNN` format, area prefix matches the feature (`AUTH`/`BOOK`/`COL`/`PROF`), no gaps or reused IDs across the file's history (check git blame/prior version if unsure whether a missing number was retired or never assigned)
3. **Title** — action-based, states the condition being tested, no ID embedded in the title
4. **Risk** — populated with a real `Risk-N` from `docs/test-plan.md` §8, or `—` with that being a deliberate choice (not an obvious oversight — e.g. a test that clearly creates/deletes shared-backend data should carry Risk-1)
5. **Preconditions / Postconditions** — both always populated (even if `None`), specific about how state is established/torn down, not vague
6. **Test data** — concrete values only; flag vague descriptions ("valid credentials") or automation-class references (`DataFactory.createUser()`) which belong only in the Notes or in automated specs, not here
7. **Steps & expected results** — one action per step, every expected result is observable (status code, element visibility, URL, exact text/body) — flag "it works," "success," "user is logged in" without a concrete definition
8. **Automation field** — correctly reflects current state (`Not automated` or `Automated → <file>`); flag if a corresponding automated spec already exists in `tests/` but the field still says `Not automated`, or vice versa
9. **Priority field** — confirm it is absent from the test case (Priority belongs only in the condition, per the anti-patterns list) — flag if present here

---

## Output format

Report findings as a checklist, most-severe first (a missing condition reference or untestable expected result before a phrasing nit). For each issue: the test case ID(s) involved, which rule it violates, and the concrete fix.

```markdown
## Review: <file path>

| #   | Test case(s) | Issue                                    | Rule violated                      | Fix                                                            |
| --- | ------------ | ---------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| 1   | AUTH-009     | Expected result says "user is logged in" | Expected result must be observable | Specify: redirect URL, visible element, or response body field |
| 2   | AUTH-011     | No test case traces to COND-AUTH-014     | Every condition needs a test case  | Add a test case referencing COND-AUTH-014                      |

**Traceability re-verified**

- <Conditions with no test case, or test cases with no condition, or "All accurate">

**Verdict**
Ready for automation / Needs fixes before proceeding
```

If no issues are found, state that explicitly rather than omitting the report — a clean review is still a review.

Do not fix issues automatically. Report them; let the user decide what to change — the review gate exists precisely so a human stays in the loop on test design decisions before automation work begins.
