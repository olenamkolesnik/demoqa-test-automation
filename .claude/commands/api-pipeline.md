---
description: Run the full API test-authoring pipeline for one endpoint — test conditions, test cases, infrastructure, and specs — stopping after each stage's review agent for your sign-off.
---

Run the API test-authoring pipeline for: **$ARGUMENTS**

You are orchestrating four existing skills and four existing review agents. You do not write test conditions, test cases, or code yourself — each stage is delegated to its skill, and each artifact is checked by its review agent. Your job is sequencing, carrying file paths between stages, and stopping for the user at every gate.

## Input

`$ARGUMENTS` should be an endpoint, e.g. `GET /BookStore/v1/Books`. If no endpoint was given, ask for one and stop — do not guess or pick one from the spec docs.

Source the endpoint's requirements the same way every skill in this pipeline already does:

1. A live-verified `.md` doc under `docs/api-spec/` covering this resource — trusted over Swagger wherever they disagree
2. `docs/api-spec/*.swagger.json` where no corrected doc covers it
3. Ask the user **only** for what neither source has (an undocumented business rule)

Do not ask the user to restate requirements the spec docs already hold, and do not ask them to paste spec content — read it.

## Before starting: resume check

Derive the path stems from the endpoint (mechanical — the skills define these transforms; don't ask the user to confirm them):

- `<feature>` — functional area: `auth`, `bookstore`, `collection`, `profile`
- `<verb>-<resource>` — method lowercased plus the entity segment, e.g. `GET /BookStore/v1/Books` → `get-books`
- `<resource>` — the resource path segment kebab-cased, e.g. `BookStore` → `book-store`

Check what already exists:

| Stage | Artifact                                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `docs/test-conditions/api/<feature>/<verb>-<resource>.md`                                                                                     |
| 2     | `docs/test-cases/api/<feature>/<verb>-<resource>.md`                                                                                          |
| 3     | `src/types/<resource>.schema.ts`, `src/api/<resource>-api.client.ts`, `src/data/<resource>.factory.ts`, `src/fixtures/<resource>.fixtures.ts` |
| 4     | `tests/api/<verb>-<resource>.api.spec.ts`, `tests/api/<verb>-<resource>.contract.spec.ts`                                                     |

Report what you found, then start at the earliest stage whose artifact is missing.

Two rules about what you found:

- **An existing file is not a completed stage.** Nothing in this repo records that an artifact passed review. So for every pre-existing artifact, run that stage's review agent against it and present the verdict as that stage's gate before moving on. Do not skip a stage just because its file is on disk. Regenerate an existing artifact only if the user asks.
- **Stage 3 is per-resource, not per-endpoint.** One set of four infrastructure files serves every endpoint on that resource, so they can already exist on this endpoint's very first pipeline run because a sibling endpoint built them earlier. That is normal. Re-review them (they may need a new client method for this endpoint), but don't treat their existence as evidence this endpoint was already processed.

## The four stages

Each stage has the same shape: generate → review → **stop** → interpret the user's reply.

| #   | Generate with skill           | Review with agent                 | Gate verdict                   |
| --- | ----------------------------- | --------------------------------- | ------------------------------ |
| 1   | `write-test-conditions`       | `review-test-conditions`          | Ready for test case generation |
| 2   | `write-manual-test-case`      | `review-test-cases`               | Ready for automation           |
| 3   | `generate-api-infrastructure` | `review-generated-infrastructure` | Ready for test generation      |
| 4   | `generate-api-tests`          | `review-generated-tests`          | Ready to merge                 |

Pass each review agent the file path the skill just produced — every one of them requires a named target and will stop if it doesn't get one.

Stage 3 takes the endpoint spec, not the reviewed test cases, so it does not depend on stages 1–2. Stage 4 needs both the reviewed test-cases file from stage 2 and the reviewed infrastructure from stage 3.

## At every gate

Print the review agent's **full findings table and verdict, verbatim** — not a summary, not just the verdict line. Then end your turn and wait.

When the user replies:

- **Approval** ("looks good", "proceed", "ok") — move to the next stage.
- **A fix instruction** ("fix #2", "the boundary condition is wrong") — apply it, then re-invoke **the same review agent** on the revised artifact and stop again. Never advance to the next stage on the strength of your own fix; the agent re-checks it.
- **Anything ambiguous** — ask, don't assume. A wrong guess here silently propagates into every later stage.

## Rules

- Never skip a stage's review agent, even when the artifact looks obviously fine. The gates are the point of the pipeline.
- Never proceed past a gate without a reply from the user in that turn. Ending your turn at each gate is the design, not overhead to optimize away.
- If a review agent reports its own source-of-truth file missing, stop the entire pipeline and say so. Do not improvise criteria on its behalf.
- If a skill reports something it cannot generate — `generate-api-tests` explicitly refuses multi-actor test cases, for instance — stop and surface that rather than pushing through with a best-effort attempt.
- Never run the test suite or a live smoke check as part of this pipeline. Both create real data on the shared public DemoQA backend (Risk-1 in `docs/test-plan.md`). Lint, format, and `--list` are the only verification commands the review agents are permitted, and they run those themselves.
- **One narrow exception:** stage 1's `write-test-conditions` may make targeted live requests to resolve a case it would otherwise mark infeasible, under the rules in that skill's **Resolving undocumented behavior** section — a handful of `qa_`-prefixed requests, repeated to confirm, with the finding pushed into `docs/api-spec/`. This is not a smoke check: it establishes unknown behavior once, so every later stage and endpoint reads it from the spec doc instead. No other stage and no review agent may call the live API.

## When stage 4 is approved

Print a closing summary: the file path produced at each stage, and which test cases were automated versus skipped by the priority filter. Note that `generate-api-tests` has already back-written the `Automation` field in the test-cases file — no manual update is needed.
