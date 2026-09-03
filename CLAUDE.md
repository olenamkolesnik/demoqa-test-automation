# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `docs/test-plan.md` for scope, test items, approach, and risk mitigations — read it before adding new test coverage.

## API source of truth

DemoQA's own Swagger docs are unreliable — verified during spec extraction that several documented response fields and status codes are wrong or incomplete for real live behavior. `docs/api-spec/account-endpoints.md` (`/Account` endpoints) and `docs/api-spec/book-store-endpoints.md` (`/BookStore` endpoints) are the **corrected, live-verified** references covering every endpoint in the spec (specific quirks documented there, not repeated here); `docs/api-spec/book-store-api.swagger.json` is the raw (partially inaccurate) Swagger spec, kept for reference only. Trust the `.md` files over the `.json` file.

## Coding standards

See `docs/coding-standards.md` for layer responsibilities, response validation, fixture/factory conventions, naming conventions, functional-vs-contract test file structure, and traceability tagging — read it before writing or generating any `src/` or `tests/` code. Generated test code is checked against that same file by the `review-generated-tests` agent.
