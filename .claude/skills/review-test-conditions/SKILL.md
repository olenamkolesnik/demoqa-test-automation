---
name: review-test-conditions
description: Reviews an already-written test conditions file against the rules defined in write-test-conditions — coverage rules, completeness checklist, and anti-patterns. Use this to verify a conditions file before moving to test case generation, or to re-check one written or edited outside this workflow.
---

## Purpose

This skill does not define its own review criteria. It applies the rules already documented in `.claude/skills/write-test-conditions/SKILL.md` — **Coverage rules (ISTQB minimum)**, **Completeness checklist**, and **Anti-patterns** — to a specific, already-written conditions file. One source of truth for what "correct" looks like; this skill is enforcement, not a second definition.

Read `.claude/skills/write-test-conditions/SKILL.md` in full before reviewing anything.

---

## Input

The target conditions file, e.g. `docs/test-conditions/api/auth/post-user.md`. If not given explicitly, ask which file to review — do not guess.

---

## What to check

Go through the target file section by section:

1. **Endpoint analysis block** — present, and every bullet (happy path, negative cases, boundary cases, authorization states) maps to at least one condition below it
2. **Each condition** — has all required fields populated (ID, Priority, Category, Technique, Source, Test cases), `Values / boundaries` is concrete (not vague placeholders like "valid password, invalid password")
3. **Coverage rules table** — walk each row of `write-test-conditions`'s Coverage rules table against this file: valid EP, invalid EP, BVA boundaries, decision table combinations, independence, no trigger/effect splitting, required-field coverage, infeasible conditions documented
4. **Infeasible conditions** — correctly formatted (`COND-AREA-INF-NNN`, includes Priority, What to cover, Why infeasible, Mitigation)
5. **Completeness checklist section** — present, and its own Yes/No answers are actually accurate against the conditions above it (don't just trust a "Yes" — verify it)
6. **Anti-patterns** — scan for each pattern listed in `write-test-conditions`'s Anti-patterns section (vague values, unlabeled technique/source, overly broad conditions, stale "Test cases: —" that should now be populated, missing infeasible entries, trigger/effect pairs that should be merged, ID dependencies that break independence)

---

## Output format

Report findings as a checklist, most-severe first (an actual rule violation before a style nit). For each issue: the condition ID(s) involved, which rule it violates, and the concrete fix.

```markdown
## Review: <file path>

| #   | Condition(s)                 | Issue                                                           | Rule violated               | Fix                          |
| --- | ---------------------------- | --------------------------------------------------------------- | --------------------------- | ---------------------------- |
| 1   | COND-AUTH-003, COND-AUTH-004 | Same happy-path scenario split into two conditions              | No trigger/effect splitting | Merge into one condition     |
| 2   | COND-AUTH-007                | `Values / boundaries` says "valid input" with no concrete value | Values must be concrete     | Add actual string/value used |

**Completeness checklist re-verified**

- <Any checklist answer in the file found to be wrong, or "All accurate">

**Verdict**
Ready for test case generation / Needs fixes before proceeding
```

If no issues are found, state that explicitly rather than omitting the report — a clean review is still a review.

Do not fix issues automatically. Report them; let the user decide what to change, since a review's value depends on the human staying in the loop on test design decisions (same reasoning as the mandatory review gate between conditions and test cases).
