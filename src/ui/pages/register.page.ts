import type { Locator, Page } from '@playwright/test';

// Duplicates the shape of the form's own fields because src/ui/pages/ must not
// import from src/types/ (docs/coding-standards.md layer rule).
export interface RegisterDetails {
  firstName: string;
  lastName: string;
  userName: string;
  password: string;
}

export class RegisterPage {
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly userNameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly registerButton: Locator;
  private readonly backToLoginButton: Locator;
  private readonly errorParagraph: Locator;

  constructor(private readonly page: Page) {
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' });
    this.userNameInput = page.getByRole('textbox', { name: 'UserName' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    // An h1 "Register" also exists, but the button role alone already
    // disambiguates it — no exact: true needed
    // (docs/ui-spec/register-form.requirements.md, Element reference).
    this.registerButton = page.getByRole('button', { name: 'Register' });
    this.backToLoginButton = page.getByRole('button', { name: 'Back to Login' });
    // Renders the server's password-complexity message on a 400. Stays empty
    // on a 406 duplicate-username response — DIVERGENCE-3, no accessible
    // fallback exists for that case.
    this.errorParagraph = page.locator('#name');
  }

  async goto(): Promise<void> {
    await this.page.goto('/register'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  async fillDetails({ firstName, lastName, userName, password }: RegisterDetails): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.userNameInput.fill(userName);
    await this.passwordInput.fill(password);
  }

  async clickRegister(): Promise<void> {
    await this.registerButton.click();
  }

  // Collapses the sequence every one of this file's 12 test cases opens with
  // (goto → fill → click), matching login.page.ts's loginAs() precedent.
  // Cases that must pause mid-sequence to assert (e.g. an empty field's
  // value, or the styling on submit) call fillDetails()/clickRegister()
  // directly instead.
  async registerAs(details: RegisterDetails): Promise<void> {
    await this.goto();
    await this.fillDetails(details);
    await this.clickRegister();
  }

  // The success signal is a native browser alert ("User Registered
  // Successfully."), not a DOM node — it cannot be located with getByText
  // (docs/ui-spec/register-form.requirements.md, Element reference). The
  // caller must register this handler before calling clickRegister(),
  // otherwise Playwright auto-dismisses the dialog and the message is lost.
  // Returns the message rather than asserting it — page objects don't assert
  // (docs/coding-standards.md, UI test architecture).
  captureNextDialogMessage(): Promise<string> {
    return new Promise((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const message = dialog.message();
        await dialog.accept();
        resolve(message);
      });
    });
  }

  async clickBackToLogin(): Promise<void> {
    await this.backToLoginButton.click();
  }

  // is-invalid is the only signal for a blocked blank-field submission — no
  // message, no aria-invalid, nothing in the accessibility tree (DIVERGENCE-1,
  // docs/ui-spec/register-form.requirements.md). Callers assert toHaveClass on
  // these locators directly rather than through a dedicated helper, matching
  // login.page.ts's usernameField()/passwordField() precedent.
  firstNameField(): Locator {
    return this.firstNameInput;
  }

  lastNameField(): Locator {
    return this.lastNameInput;
  }

  usernameField(): Locator {
    return this.userNameInput;
  }

  passwordField(): Locator {
    return this.passwordInput;
  }

  errorMessage(): Locator {
    return this.errorParagraph;
  }
}
