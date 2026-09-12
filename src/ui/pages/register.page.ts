import type { Locator, Page } from '@playwright/test';

// Minimal by design: this page object exists only to express the assertion the
// login form's own test cases make after leaving the form (LOGIN-FORM-014,
// "the registration form is shown"). /register has no test cases of its own —
// it is CAPTCHA-gated, so the registration journey is out of scope
// (docs/test-plan.md §2) — and the login form's basis excludes this page's
// contents. Extend this only if /register ever gets its own test cases.
export class RegisterPage {
  private readonly userNameInput: Locator;
  private readonly registerButton: Locator;

  // The two members together are what "the registration form is shown" means:
  // a field plus its submit control. The page's h1 "Register" is deliberately
  // not exposed — it would prove the page painted, not that the form rendered,
  // and this page is React-rendered like /login, so the two are not the same
  // moment. The URL assertion already covers arrival.
  constructor(private readonly page: Page) {
    this.userNameInput = page.getByRole('textbox', { name: 'UserName' });
    // exact: true — an h4 "Register to Book Store" shares this accessible name
    // prefix; the role separates them and exact guards the rest
    // (verified live 2026-09-11).
    this.registerButton = page.getByRole('button', { name: 'Register', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/register'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  usernameField(): Locator {
    return this.userNameInput;
  }

  registerSubmitButton(): Locator {
    return this.registerButton;
  }
}
