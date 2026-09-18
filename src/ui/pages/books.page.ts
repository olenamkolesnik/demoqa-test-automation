import type { Locator, Page } from '@playwright/test';

// Minimal by design: /books has no test cases of its own yet. This page
// object exists to express what the logout suite's test cases need from it —
// the signed-in header block (LOGOUT-002), its signed-out replacement
// (LOGOUT-006), and the catalogue that survives logout (LOGOUT-008). Extend
// this rather than starting a second page object when the book-catalogue
// feature gets coverage.
//
// Everything below was verified live on 2026-09-18, signed in and signed out,
// with match counts rather than presence checks — see the Element reference
// in docs/ui-spec/logout.requirements.md and its stage-6 provenance row.
export class BooksPage {
  // Failure ceiling, not a wait. An unbounded action inherits the whole
  // remaining test budget, and this page's advertisement iframes can intercept
  // pointer events — which surfaces as a bare "Test timeout" naming no step.
  private static readonly STEP_TIMEOUT_MS = 10_000;

  private readonly userNameValue: Locator;
  private readonly logOut: Locator;
  private readonly login: Locator;
  private readonly searchBox: Locator;
  private readonly catalogueTable: Locator;

  constructor(private readonly page: Page) {
    // Same bare <label id="userName-value"> as /profile: no accessible name,
    // no associated caption, so the id is the only stable handle.
    this.userNameValue = page.locator('#userName-value');
    // "Log out" — TWO words on this page, unlike /profile's one-word "Logout"
    // (DIVERGENCE-1, docs/ui-spec/logout.requirements.md). This is the split
    // the requirements file originally got wrong, so do not "fix" the name to
    // match ProfilePage. Raw HTML captured 2026-09-18:
    //   <button type="button" id="submit" class="btn btn-primary">Log out</button>
    // It is the only id="submit" element on /books (unlike /profile's four),
    // but role+name is used anyway so the two page objects read the same way.
    this.logOut = page.getByRole('button', { name: 'Log out', exact: true });
    // Rendered in place of the header block when there is no session. The left
    // nav also renders a *link* named "Login" — a different role, so it cannot
    // collide here — but exact: true is kept for the same reason LoginPage
    // needs it, so a later reader does not see the two locators diverge.
    this.login = page.getByRole('button', { name: 'Login', exact: true });
    // Present in both states; verified as one match each way.
    this.searchBox = page.getByRole('textbox', { name: 'Type to search' });
    // One table on the page in both states. Columns are Image / Title /
    // Author / Publisher signed in AND signed out — there is no Action column
    // on /books; that belongs to /profile's collection table (REQ-LOGOUT-032,
    // corrected 2026-09-18).
    this.catalogueTable = page.getByRole('table');
  }

  async goto(): Promise<void> {
    await this.page.goto('/books'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  async clickLogOut(): Promise<void> {
    await this.logOut.click({ timeout: BooksPage.STEP_TIMEOUT_MS });
  }

  userName(): Locator {
    return this.userNameValue;
  }

  logOutButton(): Locator {
    return this.logOut;
  }

  loginButton(): Locator {
    return this.login;
  }

  searchInput(): Locator {
    return this.searchBox;
  }

  // The column-header cells, for asserting the header row's shape — e.g.
  // toHaveText(['Image', 'Title', 'Author', 'Publisher']) in both states.
  columnHeaders(): Locator {
    return this.catalogueTable.getByRole('columnheader');
  }

  // One link per listed book (the title cell), so its count is the number of
  // books in the catalogue. Eight on the live site as of 2026-09-18.
  bookTitleLinks(): Locator {
    return this.catalogueTable.getByRole('link');
  }
}
