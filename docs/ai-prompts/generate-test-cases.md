# Prompt: Generate Test Cases

## When to use

Second step — only after test conditions have been reviewed and approved.
Never run this prompt against unreviewed conditions.

## Inputs required

- Reviewed and approved conditions file in `docs/test-conditions/`
- Project risks (already included in the prompt — update if risks change)

## Output

`docs/test-cases/[TYPE]/[FEATURE]/[ENDPOINT].md`

## Skill dependency

`.claude/skills/write-manual-test-case.md`

## Review gate

Before marking test cases ready for automation, verify:

- [ ] Every condition has at least one test case
- [ ] Every BVA boundary from the condition has its own test case
- [ ] Condition ID is referenced in every test case
- [ ] Test data is concrete — no vague descriptions or automation class references
- [ ] Postconditions specify cleanup for every test that creates data
- [ ] Risk is assigned where relevant — not left blank without reason
- [ ] Conditions file Test cases field has been updated with generated IDs

---

## Prompt

```
You are working on the demoqa-test-automation portfolio project.

## Your task
Generate test cases for [METHOD] [/endpoint/path] from reviewed and approved conditions.
Output file: docs/test-cases/[TYPE]/[FEATURE]/[ENDPOINT].md

## Skills to apply
Read and follow .claude/skills/write-manual-test-case.md exactly.

## Input 1 — Reviewed conditions file
Read the approved conditions from:
docs/test-conditions/[TYPE]/[FEATURE]/[ENDPOINT].md

## Input 2 — Project risks reference
From docs/test-plan.md §8:
- Risk-1: Shared public backend — shared state, subject to change without notice
- Risk-2: API-seeded UI coupling — hidden coupling between suites
- Risk-3: Flaky async UI — flaky tests eroding confidence
- Risk-4: Auth sandbox inconsistency — negative-path/auth testing may behave inconsistently

## Instructions
1. Read the skill file before writing anything
2. Read the conditions file — do not derive new conditions, work only from what is there
3. For each condition:
   - Create one test case per value or boundary listed in the condition's Values/boundaries field
   - Reference the condition ID in the Condition field of every test case
   - Assign Risk from the project risks reference — do not assign Priority (that lives in the condition)
   - State concrete Postconditions — what cleanup is needed after the test completes
4. After writing all test cases, update docs/test-conditions/[TYPE]/[FEATURE]/[ENDPOINT].md —
   populate each condition's Test cases field with the generated IDs

Do not create new conditions. Do not skip any value or boundary listed in a condition.
```
