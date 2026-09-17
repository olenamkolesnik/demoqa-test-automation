import type { Locator, Page } from '@playwright/test';

// Minimal by design: /profile has no test cases of its own yet. This page
// object exists to express what other suites' test cases need from it — the
// login form's post-sign-in assertions (LOGIN-FORM-007, LOGIN-FORM-013) — plus
// deleteAccount(), which is retained for a future test covering the delete
// flow itself. Extend this rather than starting a second page object.
export class ProfilePage {
  private readonly userNameValue: Locator;
  private readonly logOut: Locator;
  private readonly deleteAccountButton: Locator;
  private readonly deleteAccountConfirmButton: Locator;

  constructor(private readonly page: Page) {
    // The username renders as a <label id="userName-value"> with no accessible
    // name of its own — it sits beside a separate "User Name :" caption rather
    // than being associated with one, so no getByRole/getByLabel query reaches
    // it. The id is the only stable handle (verified live 2026-09-11).
    // Note #userName-label is NOT this caption: it reads "Books :".
    this.userNameValue = page.locator('#userName-value');
    // "Logout" — one word, unlike the "Log out" button the login page shows in
    // its already-signed-in state (REQ-LOGIN-003). Located by role and name
    // because id="submit" is shared with Delete Account and Delete All Books
    // on this page (four elements, verified live 2026-09-11).
    this.logOut = page.getByRole('button', { name: 'Logout' });
    // Opens a confirmation dialog rather than deleting immediately — see
    // deleteAccount() below. Role+name disambiguates from the other
    // id="submit" buttons on this page, same as logOut above.
    this.deleteAccountButton = page.getByRole('button', { name: 'Delete Account' });
    // Inside the "Delete Account" confirmation dialog; exact: true separates
    // it from "OK" substring collisions with any other dialog control
    // (verified live 2026-09-14; modal confirmed again 2026-09-16 as
    // `.modal` / `#closeSmallModal-ok`).
    this.deleteAccountConfirmButton = page.getByRole('button', { name: 'OK', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  async clickLogOut(): Promise<void> {
    await this.logOut.click();
  }

  // Deletes the signed-in account through the page's own Delete Account
  // control. **Not for teardown** — use deleteSeededUser(), which is
  // deterministic; this route depends on rendering and the page's
  // advertisement iframes and orphaned an account roughly 1 run in 12. Kept
  // for a future test whose subject *is* deleting through the UI.
  async deleteAccount(): Promise<void> {
    // The button sits below the fold, and a click issued while it is off-screen
    // focuses it without opening the confirmation modal — leaving the run
    // waiting for an OK button that never appears.
    await this.deleteAccountButton.scrollIntoViewIfNeeded({
      timeout: ProfilePage.STEP_TIMEOUT_MS,
    });
    await this.deleteAccountButton.click({ timeout: ProfilePage.STEP_TIMEOUT_MS });

    await this.deleteAccountConfirmButton.waitFor({
      state: 'visible',
      timeout: ProfilePage.STEP_TIMEOUT_MS,
    });
    await this.deleteAccountConfirmButton.click({ timeout: ProfilePage.STEP_TIMEOUT_MS });
  }

  // Ceiling per step, not a wait: each action resolves as soon as Playwright's
  // actionability check passes. It exists because an action left unbounded
  // inherits the caller's entire remaining test budget — and this page loads
  // advertisement iframes that can intercept pointer events over the button.
  // That produced this test's worst failure mode: a bare "Test timeout of
  // 90000ms exceeded" naming no step, with the caller's own catch never
  // reached, so not even the orphaned account was logged.
  private static readonly STEP_TIMEOUT_MS = 10_000;

  userName(): Locator {
    return this.userNameValue;
  }

  logOutButton(): Locator {
    return this.logOut;
  }
}
