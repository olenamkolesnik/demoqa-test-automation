---
name: generate-ui-infrastructure
description: Generates Page Object Model code for a DemoQA page — src/pages/ and src/components/ — by inspecting the live page rather than guessing at its structure. Triggered by a URL or page name, independent of test design being finished. Use before generate-ui-tests, which assumes the page object already exists. Does not generate src/flows/ — those are created by generate-ui-tests when a specific test case needs one.
---

## Purpose

UI tests can't be written against a page with no page object. This skill builds `src/pages/` (and, when an element is shared across pages, `src/components/`) for a given DemoQA page, following the three-layer composition model in `docs/coding-standards.md`'s UI test architecture section. Read that section in full before generating anything — it defines composition-not-inheritance, the locator priority order, and the layer boundaries this skill must follow exactly.

This skill does not generate `src/flows/` (multi-page journeys) or test specs. A flow is created by `generate-ui-tests`, the first time a specific test case's precondition actually needs one — building one here would mean guessing at a journey shape nothing has confirmed yet.

---

## Input

A URL or a page name (e.g. `https://demoqa.com/books` or "the book store page"). If genuinely ambiguous which DemoQA page is meant, ask — don't guess a URL.

### Inspecting the live page

Unlike the API side (which has a Swagger spec, however unreliable), there is no structured spec for DemoQA's UI. This skill inspects the real, live page rather than guessing at its structure — same precedent as the API side trusting live-verified behavior over documentation:

1. Load the page (via whatever browser/navigation tool is available in this session)
2. Identify the interactive elements relevant to the test plan's scope for this page (`docs/test-plan.md` §3) as a candidate list — not every element on the page, only what its named features imply (e.g. for the books page, §3 lists "Book catalogue browsing & search" and "Add/remove books to personal collection," implying a search input, a book list/row, and an add/remove control — not every link in the page's chrome)
3. **Propose this candidate list to the user before generating anything, and wait for confirmation or edits.** There is no test-cases file yet to mechanically bound scope against (infrastructure is generated before test design finishes, by design) — so the element list is a judgment call, and judgment calls get confirmed, not assumed.
4. For each confirmed element, determine its locator using the priority order in `docs/coding-standards.md`: `getByRole`/`getByLabel`/`getByText` first, `getByTestId` next, raw CSS/XPath only as a last resort — and note in a comment when a CSS selector was necessary and why (DemoQA's markup is known to be inconsistent)

If the page can't be loaded live in this session (no browser tool available), stop and say so explicitly rather than inventing plausible-looking locators from memory or assumption — a guessed locator is worse than no page object, since it fails silently until a test runs against it.

### Deriving file names

Page object: `src/pages/<page-name>.page.ts`, class name `<PageName>Page` — derive `<page-name>` from the URL path segment or the page's own heading/title, kebab-cased (e.g. `/books` → `books.page.ts` → `class BooksPage`).

Component: `src/components/<component-name>.component.ts`, class name `<ComponentName>Component` (e.g. `header.component.ts` → `class HeaderComponent`).

---

## Deciding page vs. component

Before writing a new page object, check every already-generated file in `src/pages/` and `src/components/` for a widget matching what this page needs (e.g. a nav bar, search bar, book-list row):

- **Already extracted as a component** → import and compose it into the new page object; don't re-describe its locators inline
- **Present on this page and at least one other already-generated page, but not yet extracted** → extract it into `src/components/` now, **and edit the earlier page object(s) to compose the new component instead of their inline locators.** This is a real modification to a previously-generated (and possibly already-tested) file, not just a new file being added — call it out explicitly in the output summary (e.g. "Also modified: src/pages/login.page.ts — extracted shared HeaderComponent"), so the user isn't surprised a file they didn't ask to touch this run has changed.
- **Present only on this one page so far** → keep its locators directly in the page object; do not speculatively extract a component before a second page actually needs it (matches `docs/coding-standards.md`'s DRY guidance — don't abstract before reuse is real)

The very first page object generated in this project will have no components to reuse or extract from — that's expected, not a gap.

---

## What to generate

### Page object — `src/pages/<page-name>.page.ts`

```ts
export class BooksPage {
  readonly header: HeaderComponent;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page); // composition, not inheritance — per coding-standards.md
  }

  async goto() {
    await this.page.goto('/books'); // relative to playwright.config.ts's use.baseURL — never a hardcoded https://demoqa.com URL
  }

  // one method per single-page user action or query this page needs to support
  async searchFor(title: string) {
    /* ... */
  }
}
```

(`HeaderComponent` here is illustrative — only compose a component that was actually extracted per the "Deciding page vs. component" rule above; the very first page generated in this project will have none to compose yet.)

- Locators live as private fields or are resolved inline in methods — never exposed as public properties for a test to chain arbitrarily; a test calls a named method, it doesn't reach into the page object's internals
- Methods act only on this page. If a method would need to navigate to a different page and act there too, that's a sign the caller needs a flow (`src/flows/`, generated later by `generate-ui-tests`) — don't fold that into this page object
- No assertions inside a page object — a method returns state (text, visibility, a locator) for the test to assert on, per the layer table in `docs/coding-standards.md`

### Component — `src/components/<component-name>.component.ts`

Same shape as a page object, minus navigation — a component doesn't know which page it's on, only how to interact with itself:

```ts
export class HeaderComponent {
  constructor(private readonly page: Page) {}

  async clickNavLink(label: string) {
    /* ... */
  }
}
```

---

## What NOT to do

- Don't generate `src/flows/` or any `tests/**/*.spec.ts` file — out of scope for this skill
- Don't guess locators without loading the live page — stop and say so instead
- Don't use raw CSS/XPath when an accessible locator (role/label/text) or `data-testid` would work — that's a last resort, not a default
- Don't extract a component before a second page actually needs the same widget
- Don't add assertions inside a page object or component method
- Don't give a page object a base-class inheritance chain — compose components as properties instead, per `docs/coding-standards.md`

---

## Verification before considering this done

1. `npm run lint` and `npm run format:check` — both clean on all generated files
2. A manual smoke check (a throwaway script, not committed) drives the new page object against the live page at least once, confirming every generated locator actually resolves to a real element — an untested locator is a guess, not a verified one

## Output summary

End with a summary that names every file touched, not just the new one:

```markdown
## Generated: <page-name>

- Page object: src/pages/<page-name>.page.ts
- Components used: <component names, or "None">
- New components extracted: <component name(s), or "None">
- Also modified (component extraction required updating an earlier page): <file(s), or "None">
```
