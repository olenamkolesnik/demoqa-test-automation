# AI Prompts

Prompt templates for AI-assisted test design workflows. Each prompt is a template — replace `[PLACEHOLDERS]` before use.

## Workflow

```
Prompt 1: generate-test-conditions.md
        ↓
  Human review gate
        ↓
Prompt 2: generate-test-cases.md
        ↓
  Human review gate
        ↓
  Automation (write-test-case.md skill)
```

The review gate between each step is mandatory — the sequence only has value if a human approves the output before the next step runs.

## Prompts

| File                          | Purpose                                                                                 | Output                  |
| ----------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| `generate-test-conditions.md` | Derives test conditions from endpoint spec using EP, BVA, and decision table techniques | `docs/test-conditions/` |
| `generate-test-cases.md`      | Generates human-readable test cases from reviewed conditions                            | `docs/test-cases/`      |

## Skill dependencies

Both prompts depend on skills in `.claude/skills/`. Ensure the relevant skill file exists before running a prompt.

| Prompt                        | Skill                                      |
| ----------------------------- | ------------------------------------------ |
| `generate-test-conditions.md` | `.claude/skills/write-test-conditions.md`  |
| `generate-test-cases.md`      | `.claude/skills/write-manual-test-case.md` |

## Placeholder reference

| Placeholder        | Example                                      |
| ------------------ | -------------------------------------------- |
| `[METHOD]`         | `POST`, `GET`, `DELETE`                      |
| `[/endpoint/path]` | `/Account/v1/User`                           |
| `[TYPE]`           | `api`, `ui`                                  |
| `[FEATURE]`        | `auth`, `bookstore`, `collection`, `profile` |
| `[ENDPOINT]`       | `registration`, `token`, `authorization`     |
