import type { Locator, Page } from '@playwright/test';

// Minimal by design: /profile has no test cases of its own. This page object
// exists to express what two other suites' test cases need from it —
// the login form's post-sign-in assertions (LOGIN-FORM-007, LOGIN-FORM-013),
// and the register form's account-deletion teardown (REGISTER-FORM-007,
// which needs deleteAccount() because a UI-registered account's userId is
// never recoverable for the API delete route — see that method's comment).
// Extend this rather than starting a second page object.
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
    // (verified live 2026-09-14 — used to delete a UI-registered account with
    // no other recoverable id, see docs/ui-spec/register-form.requirements.md).
    this.deleteAccountConfirmButton = page.getByRole('button', { name: 'OK', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  async clickLogOut(): Promise<void> {
    await this.logOut.click();
  }

  // The only teardown route for an account that was registered through the UI
  // itself rather than seeded via the API: DemoQA's registration form never
  // surfaces the created userId (not in the success alert, not recoverable
  // from any /Account endpoint by username — verified live 2026-09-14), so
  // DELETE /Account/v1/User/{userId} is unreachable for it. Deleting through
  // this page needs only the credentials already used to sign in.
  async deleteAccount(): Promise<void> {
    await this.deleteAccountButton.click();
    await this.deleteAccountConfirmButton.click();
  }

  userName(): Locator {
    return this.userNameValue;
  }

  logOutButton(): Locator {
    return this.logOut;
  }
}
