# DemoQA Test Automation

[![Playwright Tests](https://github.com/olenamkolesnik/demoqa-test-automation/actions/workflows/playwright.yml/badge.svg?branch=main)](https://github.com/olenamkolesnik/demoqa-test-automation/actions/workflows/playwright.yml)
[![Latest report](https://img.shields.io/badge/report-latest-2EAD33?logo=playwright&logoColor=white)](https://olenamkolesnik.github.io/demoqa-test-automation/)
[![Report history](https://img.shields.io/badge/report-history-blue)](https://olenamkolesnik.github.io/demoqa-test-automation/history.html)
[![Playwright](https://img.shields.io/badge/Playwright-1.62-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

📊 **[Latest test report](https://olenamkolesnik.github.io/demoqa-test-automation/)** · **[Run history](https://olenamkolesnik.github.io/demoqa-test-automation/history.html)** — published automatically on every push to `main` and on every pull request.

ISTQB-aligned test automation for the [DemoQA](https://demoqa.com) Book Store application, covering both the REST API and the web UI with TypeScript and Playwright.

**API coverage** — account management (`/Account/v1`): user creation, token generation, authorization checks, and profile retrieval. Functional tests assert behaviour; separate contract tests validate response bodies against Zod schemas.

**UI coverage** — planned: login, book catalogue browsing, collection management, and profile state. See [Current scope](#current-scope) for what is implemented today.

Test design follows equivalence partitioning, boundary value analysis, and decision-table coverage of authorization states. Every automated test traces to a reviewed test case in `docs/test-cases/`, which in turn traces to a test condition in `docs/test-conditions/`.

## Current scope

| Area                          | Status                                                  |
| ----------------------------- | ------------------------------------------------------- |
| `GET /Account/v1/User/{UUID}` | Automated — 3 functional + 2 contract tests             |
| `POST /Account/v1/User`       | Specified in `docs/test-cases/`, not yet automated      |
| BookStore API (`/BookStore`)  | Specified in `docs/api-spec/`, not yet automated        |
| UI (all flows)                | Planned — `src/pages/` and `tests/ui/` are placeholders |

## Project structure

```
src/
  api/         Typed API clients — send requests, return the raw response, never assert
  types/       Zod schemas and the types inferred from them
  data/        Pure test-data factories (unique usernames, valid/invalid passwords)
  fixtures/    Setup and teardown — seed a user, hand it to the test, delete it after
  utils/       Cross-cutting helpers: logging, secret redaction, response parsing
  pages/       Page objects (UI — not yet populated)
tests/
  api/         *.api.spec.ts (functional) and *.contract.spec.ts (schema validation)
  ui/          UI specs (not yet populated)
docs/          Test plan, coding standards, API spec, test conditions and test cases
scripts/       CI maintenance — report publishing
```

Each layer has one job and depends only on the layer below it: a test never constructs a
client directly, a client never asserts, a factory never makes a network call. The rules
and the reasoning behind them are in [`docs/coding-standards.md`](docs/coding-standards.md).

---

## Base setup

### Prerequisites

| Tool        | Minimum version             | Download                                 |
| ----------- | --------------------------- | ---------------------------------------- |
| **Node.js** | `>=22.22.1` — 24 LTS tested | <https://nodejs.org/en/download>         |
| **npm**     | Bundled with Node.js        | —                                        |
| **Git**     | Any recent version          | <https://git-scm.com/downloads>          |
| **VS Code** | Optional, recommended       | <https://code.visualstudio.com/download> |

CI runs the current Node LTS (24.x). The `22.22.1` floor comes from `lint-staged`; ESLint additionally excludes 23.x, so use **22 LTS or 24 LTS** — odd-numbered Node releases are unsupported.

Verify your installation:

```bash
node --version
npm --version
git --version
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/olenamkolesnik/demoqa-test-automation.git
cd demoqa-test-automation

# 2. Install dependencies (uses package-lock.json for a reproducible install)
npm ci

# 3. Install the Playwright browser
#    Only Chromium is configured; omit the argument to install all browsers.
npx playwright install --with-deps chromium

# 4. Create your local environment file
cp .env.example .env
```

The suite fails immediately with an explicit message if `.env` is missing or `BASE_URL` is unset — see [Environment variables](#environment-variables).

---

## How to use the test solution

### VS Code setup

Install the official **[Playwright Test for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)** extension (`ms-playwright.playwright`). It adds:

- A **Testing** sidebar to run or debug any test by clicking the gutter icon
- **Pick locator** — hover the running page to generate a locator
- **Record new** — generate a test by interacting with the browser
- Inline pass/fail annotations directly in the editor

```bash
code --install-extension ms-playwright.playwright
```

Recommended companions: `dbaeumer.vscode-eslint` and `esbenp.prettier-vscode`.

### Test execution

| Command                                       | Description                                                           |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `npm test`                                    | Run the entire suite                                                  |
| `npm run test:api`                            | Run API tests only (`tests/api`)                                      |
| `npm run test:ui`                             | Run UI tests only — no tests yet, see [Current scope](#current-scope) |
| `npm run test:headed`                         | Run with a visible browser window                                     |
| `npm run test:debug`                          | Run with the Playwright Inspector attached                            |
| `npm run test:report`                         | Open the HTML report from the last run                                |
| `npx playwright test --grep @contract`        | Run only schema/contract tests                                        |
| `npx playwright test --grep @negative`        | Run only negative-path tests                                          |
| `npx playwright test --grep @AUTH-012`        | Run one specific test case by its traceability ID                     |
| `npx playwright test --grep-invert @contract` | Exclude a tag — here, functional tests only                           |
| `npx playwright test get-user`                | Run tests whose file path matches a substring                         |
| `npx playwright test --repeat-each 5`         | Re-run tests repeatedly to expose flakiness                           |
| `npx playwright test --workers 1`             | Run serially — useful when debugging shared-state interference        |

Available tags: `@positive`, `@negative`, `@contract`, `@AUTH`, plus one per test case (`@AUTH-012`, `@AUTH-013`, `@AUTH-014`) linking each test back to `docs/test-cases/`.

### Playwright-specific commands

**Record a test (Codegen)** — opens a browser and writes test code as you interact:

```bash
# Record against the configured base URL
npx playwright codegen https://demoqa.com

# Record and save straight to a file
npx playwright codegen --target typescript -o tests/ui/new-test.spec.ts https://demoqa.com
```

**UI Mode** — the recommended way to develop and debug tests. Provides a watch mode, time-travel through each step, a DOM snapshot per action, and a locator picker:

```bash
npx playwright test --ui
```

**Trace viewer** — step through a recorded run with a DOM snapshot per action:

```bash
# Force a trace locally (config records only on the first retry, and retries
# are disabled outside CI, so a plain local failure produces no trace)
npx playwright test --trace on

npx playwright show-trace test-results/<test-name>/trace.zip
```

In CI, `retries: 2` means a failing test is retried and its trace is captured automatically — download the `playwright-report` artifact from the run to inspect it.

**Update visual snapshots** — regenerate baseline screenshots after an intentional UI change:

```bash
# Update every snapshot
npx playwright test --update-snapshots

# Update snapshots for one spec only
npx playwright test tests/ui/book-store.spec.ts --update-snapshots
```

> **Note:** this project does not yet contain visual regression tests. The command is documented for when UI coverage with `toHaveScreenshot()` is added. Review every regenerated baseline before committing — `--update-snapshots` accepts whatever the page currently renders, including a genuine regression.

---

## Authorization data & environment variables

### Environment variables

All environment-specific configuration lives in a local `.env` file. It is listed in `.gitignore` and **must never be committed**.

```bash
cp .env.example .env
```

| Variable   | Required | Description                                                                       |
| ---------- | -------- | --------------------------------------------------------------------------------- |
| `BASE_URL` | Yes      | Base URL of the system under test. `playwright.config.ts` fails fast if unset.    |
| `DEBUG`    | No       | Set to the literal string `true` to log request and response bodies. Default off. |

In CI, `BASE_URL` is set directly in `.github/workflows/playwright.yml`. Any future secret must be stored as a **GitHub Actions repository secret** and referenced with `${{ secrets.NAME }}` — never hard-coded in the workflow.

### Authorization data

The system under test is a **public sandbox with no shared credentials**. Each test creates its own user through the API and deletes it during teardown, so there is no shared account to obtain or rotate.

Test users are generated by `src/data/user.factory.ts`:

- **Usernames** are prefixed `qa_` and suffixed with a random value, so parallel workers never collide and any orphaned record left by a crashed run is identifiable.
- **Passwords** are constructed to satisfy every complexity rule by design, rather than relying on a random generator that may not.

Tests never read credentials from `.env`. If this solution is ever pointed at an environment that **does** require shared credentials, add them to `.env` for local runs and store them as GitHub Actions repository secrets for CI — never commit them, and never share them over chat.

### Session state (`storageState`)

Playwright can persist an authenticated browser session to a JSON file and reuse it, so each test starts logged in without repeating the login flow through the UI:

```ts
// Save once in a setup project
await page.context().storageState({ path: 'playwright/.auth/user.json' });

// Reuse in playwright.config.ts
use: {
  storageState: 'playwright/.auth/user.json';
}
```

> **Note:** not yet implemented. Current API tests authenticate with a bearer token acquired per test via fixtures (`src/fixtures/account.fixtures.ts`), which needs no stored browser state. `storageState` becomes relevant once UI tests exist. When added, `playwright/.auth/` is already gitignored — an auth state file is a live credential and must not be committed.

---

## CI & reporting

The GitHub Actions workflow runs the suite on every push to `main` and on every pull request.

- **Pull requests** — the report is published and a bot comments the direct link on the PR.
- **`main`** — the report is published as the site's front page.

| Destination                                                                         | Contents                               |
| ----------------------------------------------------------------------------------- | -------------------------------------- |
| [Latest report](https://olenamkolesnik.github.io/demoqa-test-automation/)           | Latest report from `main`              |
| [Run history](https://olenamkolesnik.github.io/demoqa-test-automation/history.html) | Index of recent runs, with pass/fail   |
| `https://olenamkolesnik.github.io/demoqa-test-automation/runs/<run-number>/`        | Permanent archive of an individual run |

## Contributing

Branch from `main`, open a pull request, and squash merge once CI is green.

```bash
git checkout main && git pull
git checkout -b feat/short-description   # feat/ | docs/ | chore/
# ...changes...
git add -A && git commit -m "Describe the change"
git push -u origin feat/short-description

# after the pull request is squash merged
git checkout main && git pull
git branch -D feat/short-description
```

`main` is protected: the Playwright check must pass before a pull request can be merged. A Husky pre-commit hook runs ESLint and Prettier on staged files.

> Squash merging rewrites the branch's commits into one, so `git branch -d` will not recognise it as merged — use `-D`.

Before writing code, read [`docs/coding-standards.md`](docs/coding-standards.md); before adding coverage, read [`docs/test-plan.md`](docs/test-plan.md).

---

## Useful links & contacts

### Project documentation

| Document          | Location                                                                         |
| ----------------- | -------------------------------------------------------------------------------- |
| Test plan         | [`docs/test-plan.md`](docs/test-plan.md)                                         |
| Coding standards  | [`docs/coding-standards.md`](docs/coding-standards.md)                           |
| API specification | [`docs/api-spec/`](docs/api-spec/)                                               |
| Test conditions   | [`docs/test-conditions/`](docs/test-conditions/)                                 |
| Test cases        | [`docs/test-cases/`](docs/test-cases/)                                           |
| Issue tracker     | [GitHub Issues](https://github.com/olenamkolesnik/demoqa-test-automation/issues) |

### External documentation

- [Playwright documentation](https://playwright.dev/docs/intro)
- [Playwright API reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [Playwright test annotations & tags](https://playwright.dev/docs/test-annotations)
- [TypeScript handbook](https://www.typescriptlang.org/docs/)
- [Zod documentation](https://zod.dev/)
- [System under test — DemoQA](https://demoqa.com)

### Contributors & contacts

| Role             | Name           | Contact                                                                                                   |
| ---------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| Automation Owner | Olena Kolesnik | [GitHub](https://github.com/olenamkolesnik) · [olenamkolesnik@gmail.com](mailto:olenamkolesnik@gmail.com) |

Questions, suggestions, or bug reports: open an [issue](https://github.com/olenamkolesnik/demoqa-test-automation/issues) or a pull request.
