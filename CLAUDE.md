# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `docs/test-plan.md` for scope, test items, approach, and risk mitigations — read it before adding new test coverage.

## API source of truth

DemoQA's own Swagger docs are unreliable — verified during spec extraction that several documented response fields and status codes are wrong or incomplete for real live behavior. `docs/api-spec/account-endpoints.md` is the **corrected, live-verified** reference for the `/Account` endpoints (specific quirks documented there, not repeated here); `docs/api-spec/book-store-api.swagger.json` is the raw (partially inaccurate) Swagger spec, kept for reference only. Trust the `.md` file over the `.json` file.

## Non-obvious project conventions

- Response parsing must go through zod validation (`parseJsonBody` in `src/utils/api-response.util.ts`), never a blind `as T` cast — `@typescript-eslint/no-explicit-any` is `error` project-wide, and a blind cast would defeat the point of a test framework catching contract drift.
- API clients (`src/api/`) return the raw `APIResponse` and never assert or throw on non-2xx — negative-path status codes are the thing under test, not an exception path. Assertions belong in test files.
- Fixtures that create backend state are prefixed `seed*` (e.g. `seedUser`) so this usage stays greppable; teardown failures are logged, not swallowed, since orphaned data on the shared public backend is otherwise untraceable.
- Test data factories (`src/data/`) stay pure — no network calls, no shared mutable state (tests run `fullyParallel`). Usernames use faker for readability; passwords are hand-rolled to guarantee complexity requirements by construction, since faker can't reliably satisfy an arbitrary rule.
