# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `docs/test-plan.md` for scope, test items, approach, and risk mitigations — read it before adding new test coverage.

## API source of truth

DemoQA's own Swagger docs are unreliable — verified during spec extraction that several documented response fields and status codes are wrong or incomplete for real live behavior. `docs/api-spec/account-endpoints.md` is the **corrected, live-verified** reference for the `/Account` endpoints (specific quirks documented there, not repeated here); `docs/api-spec/book-store-api.swagger.json` is the raw (partially inaccurate) Swagger spec, kept for reference only. Trust the `.md` file over the `.json` file.

## Coding standards

See `docs/coding-standards.md` for layer responsibilities, response validation, fixture/factory conventions, naming conventions, functional-vs-contract test file structure, and traceability tagging — read it before writing or generating any `src/` or `tests/` code.
