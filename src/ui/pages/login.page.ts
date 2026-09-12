import type { Locator, Page } from '@playwright/test';

// Duplicates LoginPayload's shape because src/pages/ must not import from
// src/types/ (docs/coding-standards.md layer rule).
export interface LoginCredentials {
  userName: string;
  password: string;
}

export class LoginPage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorParagraph: Locator;
  private readonly alreadyLoggedInText: Locator;
  private readonly logOut: Locator;
  private readonly profile: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByRole('textbox', { name: 'UserName' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    // exact: true — the left nav also renders a link named "Login"
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    this.errorParagraph = page.getByText('Invalid username or password!');
    this.alreadyLoggedInText = page.getByText('You are already logged in.');
    this.logOut = page.getByRole('button', { name: 'Log out' });
    // exact: true — the left nav renders link "Profile" (capital P) on every
    // page; the already-signed-in state's own link is "profile". Accessible-name
    // matching is case-insensitive unless exact is set, so exact: true is what
    // separates them here — both the whole-string match and the case matter.
    // Verified 2026-09-11; see the Element reference in
    // docs/ui-spec/login-form.requirements.md.
    this.profile = page.getByRole('link', { name: 'profile', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  async fillCredentials({ userName, password }: LoginCredentials): Promise<void> {
    await this.usernameInput.fill(userName);
    await this.passwordInput.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async loginAs(credentials: LoginCredentials): Promise<void> {
    await this.goto();
    await this.fillCredentials(credentials);
    await this.clickLogin();
  }

  async submitWithEnterKey(): Promise<void> {
    await this.passwordInput.press('Enter');
  }

  // is-invalid is the only signal for a blocked blank-field submission — no
  // message, no aria-invalid, nothing in the accessibility tree (DIVERGENCE-1,
  // docs/ui-spec/login-form.requirements.md). Callers assert toHaveClass on
  // these locators directly rather than through a dedicated helper.
  usernameField(): Locator {
    return this.usernameInput;
  }

  passwordField(): Locator {
    return this.passwordInput;
  }

  errorMessage(): Locator {
    return this.errorParagraph;
  }

  alreadyLoggedInMessage(): Locator {
    return this.alreadyLoggedInText;
  }

  logOutButton(): Locator {
    return this.logOut;
  }

  profileLink(): Locator {
    return this.profile;
  }
}
