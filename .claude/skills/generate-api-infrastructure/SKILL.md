---
name: generate-api-infrastructure
description: Generates the supporting code a new API resource needs before tests can be written against it — zod schema, API client methods, test data factory, and Playwright fixtures with seed*/teardown. Triggered directly from an endpoint spec, independent of test design being finished. Use before generate-api-tests, which assumes this infrastructure already exists.
---

## Purpose

Test cases can't be automated against an endpoint with no client method, no response schema, and no fixture to seed its preconditions. This skill builds that supporting layer — `src/types/`, `src/api/`, `src/data/`, `src/fixtures/` — for a new resource, following the exact pattern already established for `Account` (`src/api/account-api.client.ts`, `src/types/account.schema.ts`, `src/data/user.factory.ts`, `src/fixtures/account.fixtures.ts`). Read `docs/coding-standards.md` in full before generating anything — it defines the layer responsibilities and naming conventions this skill must follow.

This skill does not write test specs. That's `generate-api-tests`, which depends on this skill having already run.

---

## Input

An endpoint or a resource's full set of endpoints — e.g. "the BookStore endpoints" or a single `METHOD /path`. If given a single endpoint of a multi-endpoint resource, still check whether a client/schema/fixture file for that resource already exists (partially built) before creating new ones — extend, don't duplicate.

### Sourcing the spec

Same order as `write-test-conditions`:

1. A corrected, live-verified `.md` doc under `docs/api-spec/` for the resource, if one exists — trust this over the raw Swagger spec when they disagree
2. Any `*.swagger.json` file under `docs/api-spec/` covering the resource — raw spec, used where no corrected doc exists yet. Don't assume a single fixed filename: list `docs/api-spec/` and match by content (which paths/resources the file actually documents), since more than one raw spec file may exist as the project grows.
3. Ask the user only for details neither source has (e.g. an undocumented business rule)

Do not ask the user to paste spec content — read it directly from these files.

### Deriving file names

`<resource>` in every path below is the resource's own path segment (not a per-endpoint verb — that only applies to `docs/test-conditions/`/`docs/test-cases/`/`tests/` file names, not to infrastructure files, since one resource's infrastructure serves all of its endpoints together). Take the resource segment from the endpoint path, kebab-case it, and use that consistently across all four layers:

- `/Account/v1/User` → resource segment `Account` → `account`
- `/BookStore/v1/Books` → resource segment `BookStore` → `book-store`

Example for a new `BookStore` resource: `src/types/book-store.schema.ts`, `src/api/book-store-api.client.ts`, `src/data/book-store.factory.ts`, `src/fixtures/book-store.fixtures.ts`. Do not ask the user to confirm this — the transform is mechanical and matches the path segment exactly, so there's no judgment call to make.

All four files live flat directly under their respective `src/` folder (matching current `src/` layout — no per-resource subfolder), one file per resource regardless of how many endpoints it has. If a resource's client or schema file grows large enough that this becomes unwieldy, that's a refactor to raise with the user — not a decision this skill makes unilaterally.

---

## What to generate

For a new resource (e.g. `BookStore`), following the naming conventions in `docs/coding-standards.md`:

### 1. Schema — `src/types/<resource>.schema.ts`

One zod schema per distinct response shape, with its `type X = z.infer<typeof XSchema>` export alongside. Model each field's real, confirmed shape — not the Swagger type if a corrected `.md` doc disagrees (e.g. Account's `code` fields are confirmed strings despite Swagger claiming `number`). If two endpoints on the same resource return the same field with different casing or shape (like `userID` vs. `userId` on Account), that is two schemas, not one reused — never force a shared type onto genuinely different live shapes.

Loosen a field to a bare `z.string()` rather than a stricter validator (`z.iso.datetime()`, `z.enum([...])`) when its real format has never actually been observed live — matching the precedent already set in `account-book.schema.ts`'s `publish_date` field. Don't encode false confidence.

### 2. Client — `src/api/<resource>-api.client.ts`

A class extending `BaseApiClient`, one method per endpoint, each wrapped in `this.logged(...)`. Per `docs/coding-standards.md`:

- Never assert or throw on non-2xx — return the raw `APIResponse`
- A method with two or more same-typed positional parameters (e.g. `userId: string, token: string`) uses a named options object instead
- Reuse `this.authHeader(token)` from the base class for authenticated requests; don't reimplement header construction

### 3. Test data factory — `src/data/<resource>.factory.ts`

Pure functions only — no network calls, no shared mutable state. Follow the `user.factory.ts` shape:

- A `buildUnique<Field>()` helper for any field requiring backend uniqueness, suffixed via the same `randomSuffix()` pattern (or import it if the suffix logic is generic enough to share — check `user.factory.ts` before duplicating)
- A `build<Resource>Payload(overrides?)` builder for the full request shape
- Named invalid-value constants (e.g. `invalidPasswords`-style) only for fields with a confirmed complexity/format rule from the spec — don't invent invalid classes not grounded in a real constraint

### 4. Fixtures — `src/fixtures/<resource>.fixtures.ts`

Custom `test` extending Playwright's base `test`, following `account.fixtures.ts`'s exact shape:

- One fixture providing the typed client from the built-in `request` fixture
- One `seed<Resource>`-prefixed fixture per distinct precondition a test might need (e.g. "resource exists" vs. "resource exists and caller is authorized") — separate named fixtures, not one fixture with a boolean flag, so the name alone states the precondition
- Teardown deletes the created resource and calls the shared `deleteAndLogOrphanOnFailure` from `src/fixtures/teardown.util.ts` — **do not reimplement this logic**; it is already resource-agnostic (takes a `successStatus` param specifically so it isn't hardcoded to Account's `204`). If teardown needs to re-acquire a credential (e.g. a token) because it wasn't already held, wrap that re-fetch in try/catch and log-and-return on failure rather than letting teardown itself throw — this exact bug was already found and fixed once in `account.fixtures.ts`; don't reintroduce it.
- Every fixture's created-resource identifier appears in any orphan log message, so a leak on the shared backend stays traceable

---

## What NOT to do

- Don't generate `tests/**/*.spec.ts` files — out of scope for this skill
- Don't skip straight to fixtures without a schema — `parseJsonBody` needs a schema to validate against, and fixtures call it
- Don't invent a shared base factory/fixture abstraction the first time a second resource is generated — per `docs/coding-standards.md`'s DRY guidance, wait until a third resource needs the same shape before extracting anything beyond what's already shared (`teardown.util.ts`, `api-response.util.ts`, `redact.util.ts`, `logger.ts`)
- Don't assume a new resource needs authorization/token fixtures if the spec shows none of its endpoints require one — generate only the fixture variants the actual endpoints need

---

## Verification before considering this done

Run in order — do not skip the smoke check because lint/format passed:

1. `npm run lint` and `npm run format:check` — both clean on all generated files
2. Confirm no blind `as T` casts exist — every response read goes through `parseJsonBody` + a schema
3. Manual smoke check (a throwaway script, not committed): exercise the new client + fixtures end-to-end against the live API at least once (create → read → delete, or whatever the resource's real lifecycle is)
4. In that same smoke check, deliberately call `parseJsonBody` with the wrong schema once and confirm it throws — this is the only way to confirm validation is real and not silently passing. Remove this deliberate-break call before finishing; it exists only to prove the check works, not to ship it.
