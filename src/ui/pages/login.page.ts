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
  private readonly newUser: Locator;
  private readonly errorParagraph: Locator;
  private readonly alreadyLoggedInText: Locator;
  private readonly logOut: Locator;
  private readonly profile: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByRole('textbox', { name: 'UserName' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    // exact: true — the left nav also renders a link named "Login"
    this.loginButton = page.getByRole('button', { name: 'Login', exact: true });
    this.newUser = page.getByRole('button', { name: 'New User' });
    this.errorParagraph = page.getByText('Invalid username or password!');
    this.alreadyLoggedInText = page.getByText('You are already logged in.');
    this.logOut = page.getByRole('button', { name: 'Log out' });
    // exact: true — the left nav also renders a "Profile" link, which a
    // substring match would collide with (verified live 2026-09-11)
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

  async submitWithEnterKey(): Promise<void> {
    await this.passwordInput.press('Enter');
  }

  async clickNewUser(): Promise<void> {
    await this.newUser.click();
  }

  async clickProfileLink(): Promise<void> {
    await this.profile.click();
  }

  usernameField(): Locator {
    return this.usernameInput;
  }

  passwordField(): Locator {
    return this.passwordInput;
  }

  loginSubmitButton(): Locator {
    return this.loginButton;
  }

  newUserButton(): Locator {
    return this.newUser;
  }

  errorMessage(): Locator {
    return this.errorParagraph;
  }

  // The is-invalid class is the only signal for a blocked blank-field submission
  // — no message, no aria-invalid, nothing in the accessibility tree
  // (DIVERGENCE-1, docs/ui-spec/login-form.requirements.md). This is the
  // documented exception to the locator-priority rule; the CSS is scoped onto the
  // accessible locator rather than used bare.
  invalidMarkedUsernameField(): Locator {
    return this.usernameInput.and(this.page.locator('.is-invalid'));
  }

  invalidMarkedPasswordField(): Locator {
    return this.passwordInput.and(this.page.locator('.is-invalid'));
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

  // Non-retrying reads, unlike every query above: safe only once the caller has
  // synchronised on the outcome (awaiting errorMessage() after a submit).
  getUsernameValue(): Promise<string> {
    return this.usernameInput.inputValue();
  }

  getPasswordValue(): Promise<string> {
    return this.passwordInput.inputValue();
  }
}
