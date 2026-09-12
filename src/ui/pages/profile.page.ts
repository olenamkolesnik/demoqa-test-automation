import type { Locator, Page } from '@playwright/test';

// Minimal by design: this page object exists only to express the assertions
// the login form's own test cases make after a successful sign-in
// (LOGIN-FORM-007, LOGIN-FORM-013). /profile has no test cases of its own yet;
// when it does, extend this rather than starting a second page object.
export class ProfilePage {
  private readonly userNameValue: Locator;
  private readonly logOut: Locator;

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
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  async clickLogOut(): Promise<void> {
    await this.logOut.click();
  }

  userName(): Locator {
    return this.userNameValue;
  }

  logOutButton(): Locator {
    return this.logOut;
  }
}
