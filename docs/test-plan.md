# Test Plan — DemoQA Book Store Test Automation

## 1. Objectives

Demonstrate an ISTQB-aligned test automation solution for the DemoQA Book Store application (UI + API), using TypeScript + Playwright. The goal is a maintainable, reliable codebase backed by automated linting and CI test execution.

This project is built collaboratively with [Claude Code](https://claude.com/claude-code), Anthropic's agentic coding tool — used for scaffolding, implementation, and code review throughout.

## 2. Scope

**In scope — Book Store application only:**

- Authorization (login, invalid/expired credentials, unauthorized access)
- Account management (CRD) and book catalogue/collection management (CRUD)
- User profile management

Covered at both layers:

- **UI**: [demoqa.com/books](https://demoqa.com/books) and profile pages
- **API**: `/Account`, `/BookStore` endpoints

**Out of scope:**

- Unrelated DemoQA modules (Elements, Forms, Widgets, Alerts/Frames/Windows, Interactions)
- Performance, security penetration, and accessibility testing
- Cross-browser matrix beyond Chromium

## 3. Test Items (Features to Test)

| Layer | Feature                                  | Notes                                                          |
| ----- | ---------------------------------------- | -------------------------------------------------------------- |
| API   | User creation & authorization (CRD)      | Happy path + negative (bad credentials, invalid/missing token) |
| API   | Book collection CRUD                     | Add/remove books, unauthorized attempts                        |
| API   | Input validation                         | Invalid ISBN, duplicate book, empty/malformed fields           |
| UI    | Login flow                               | Valid/invalid credentials, session state                       |
| UI    | Logout / session termination             |                                                                |
| UI    | Book catalogue browsing & search         |                                                                |
| UI    | Add/remove books to personal collection  | Seeded via API where it removes flaky UI-driven setup          |
| UI    | Profile page — reflects collection state |                                                                |
| UI    | Empty state                              | New user, zero books in collection                             |

## 4. Test Approach

- **Levels:** System-level UI and API testing (black-box).
- **Design techniques:** Equivalence partitioning & boundary value analysis on auth inputs (username/password length, format); decision-table-style coverage of authorization states (valid token / expired / missing / wrong user).
- **UI automation:** Page Object Model — `src/pages`. Locators isolated from test logic. Web-first, auto-retrying assertions only; no hard waits (enforced via lint).
- **API automation:** Typed API clients — `src/api`. Every response asserted on status code and body/schema, including negative-path status codes (401/403/404).
- **UI/API relationship (hybrid, deliberate coupling):** API calls are used to seed and tear down state for UI tests (e.g. create a user/token via API before a UI test exercises the book-collection flow). This mirrors real-world practice — skips slow, flake-prone UI-driven setup — while pure API test cases remain fully self-contained and don't depend on UI state.
- **Auth as a first-class target:** Negative authorization scenarios (invalid token, expired session) are explicit test cases, not just a login helper used to unlock other tests.
- **Test data:** Centralized builders in `src/data` (e.g. random-suffixed usernames) to avoid collisions on the shared public backend.
- **Independence:** Every test creates and cleans up its own user/book data; no test depends on execution order.

## 5. Test Environment & Tools

| Item          | Detail                                                                            |
| ------------- | --------------------------------------------------------------------------------- |
| SUT           | https://demoqa.com (Book Store module)                                            |
| Framework     | Playwright + TypeScript                                                           |
| Browser       | Chromium (Desktop)                                                                |
| CI            | GitHub Actions                                                                    |
| Reporting     | Playwright HTML report, published to GitHub Pages per CI run                      |
| Quality gates | Husky pre-commit hook running ESLint (type-aware + Playwright rules) and Prettier |

## 6. Entry Criteria

- Scaffold on `main`: config, lint/format, folder structure in place.
- Book Store app/API confirmed reachable in a manual smoke check.

## 7. Exit Criteria

- Planned auth, account (CRD), and book (CRUD) scenarios (UI and API) implemented and passing in CI.
- CI pipeline running on GitHub Actions, publishing the Playwright HTML report to GitHub Pages.
- Zero lint/format violations on `main`.
- No known flaky test left unresolved before merge.

## 8. Risks & Mitigations

| Risk                                                                                                | Mitigation                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DemoQA is a public demo backend — shared state, subject to change without notice                    | Unique per-test data (random suffixes); isolate locators in POMs so breakage is a one-file fix                                                                           |
| API-seeded UI tests create hidden coupling between suites                                           | Keep seeding logic in dedicated fixtures (`src/fixtures`), named with a `seed*` prefix so seeding usage stays greppable and never silently reused across unrelated tests |
| Flaky tests eroding confidence                                                                      | Hard waits banned via lint rule; web-first assertions only                                                                                                               |
| Negative-path/auth testing against a public sandbox may behave inconsistently (rate limiting, etc.) | Document actual observed behavior per case; treat sandbox quirks as known limitations, not framework bugs                                                                |

## 9. Deliverables

- Automated UI + API test suites (`tests/ui`, `tests/api`)
- Reusable typed fixtures and API clients (`src/fixtures`, `src/api`)
- Test case specifications (`docs/test-cases/`)
- Playwright HTML report, published to GitHub Pages per CI run
- This test plan
