# Prompt: Generate Test Conditions

## When to use

First step for any new endpoint or feature. Always run before generating test cases.
Review and approve output before proceeding to `generate-test-cases.md`.

## Inputs required

- Endpoint spec section from `swagger.json`
- Endpoint description file (if exists)
- Business rules not captured in the spec (password complexity, field constraints, etc.)

## Output

`docs/test-conditions/[TYPE]/[FEATURE]/[ENDPOINT].md`

## Skill dependency

`.claude/skills/write-test-conditions.md`

## Review gate

Before running the test cases prompt, verify:

- [ ] Every analysis bullet maps to at least one condition
- [ ] All BVA boundaries are explicit with concrete values
- [ ] Invalid EP classes are not omitted
- [ ] Infeasible conditions are documented, not silently missing
- [ ] Completeness checklist is filled in and gaps are noted

---

## Prompt

```
You are working on the demoqa-test-automation portfolio project.

## Your task
Generate test conditions for [METHOD] [/endpoint/path].
Output file: docs/test-conditions/[TYPE]/[FEATURE]/[ENDPOINT].md

## Skills to apply
Read and follow .claude/skills/write-test-conditions.md exactly.

## Input 1 — Endpoint spec
[PASTE THE ENDPOINT SECTION FROM SWAGGER JSON HERE]

## Input 2 — Endpoint description
[PASTE ENDPOINT DESCRIPTION FILE CONTENT HERE, OR REMOVE THIS SECTION IF NONE]

## Input 3 — Business rules
[LIST ANY BUSINESS RULES NOT IN THE SPEC, OR REMOVE THIS SECTION IF NONE]
Example:
- Minimum 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one digit
- Must contain at least one special character

## Instructions
1. Read the skill file before writing anything
2. Write the endpoint analysis block first — answer all six analysis questions
3. Derive conditions from the analysis — every analysis bullet must map to at least one condition
4. Apply ISTQB minimum coverage rules: valid EP, invalid EP, BVA boundaries, independence
5. Document any infeasible conditions explicitly as COND-[AREA]-INF-NNN
6. Run the completeness checklist last and output it as the final section

Do not generate test cases — conditions only.
```
