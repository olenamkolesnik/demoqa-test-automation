import type { Locator, Page, Response } from '@playwright/test';
import type { RegisterDetails } from '../../forms/register-details';

// Browser-side globals for the page.evaluate/waitForFunction callbacks below.
// Declared here rather than adding "dom" to tsconfig's `lib`, which would put
// DOM globals in scope across Node-side code where they would be wrong.
// Reached via globalThis so they are real globals in the page, not closed-over
// variables (which Playwright cannot serialise).
interface RecaptchaBrowserGlobals {
  ___grecaptcha_cfg?: { clients?: Record<string, unknown> };
  grecaptcha?: { execute?: (id: number) => Promise<string> };
  document: { querySelector(selector: string): { value: string } | null };
}

export type { RegisterDetails };

export class RegisterPage {
  // Failure ceiling, not a wait. An unbounded action inherits the whole
  // remaining test budget, and this page's advertisement iframes can intercept
  // pointer events — which surfaces as a bare "Test timeout" naming no step.
  private static readonly STEP_TIMEOUT_MS = 10_000;

  // How long to wait for the success alert before failing with a named error
  // rather than an opaque whole-test timeout.
  private static readonly DIALOG_TIMEOUT_MS = 20_000;

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
    // on a 406 duplicate-username response, with no accessible fallback.
    this.errorParagraph = page.locator('#name');
  }

  // Performs the reCAPTCHA verification this page never triggers itself —
  // without it the form's own guard blocks every submission client-side, with
  // no request and no message. Mechanism and evidence: DIVERGENCE-4 in
  // docs/ui-spec/register-form.requirements.md.
  //
  // **Call before filling, never after** — verifying clears every input.
  async triggerInvisibleRecaptcha(): Promise<void> {
    // 1. The widget has registered a client and exposes execute().
    await this.page.waitForFunction(
      () => {
        const browser = globalThis as unknown as RecaptchaBrowserGlobals;
        return (
          typeof browser.grecaptcha?.execute === 'function' &&
          Object.keys(browser.___grecaptcha_cfg?.clients ?? {}).length > 0
        );
      },
      undefined,
      { timeout: 20_000, polling: 100 }
    );

    // 2. The widget has issued its **own** initial token. This step is what
    // makes the rest deterministic: calling execute() before the widget has
    // settled makes it fire the callback twice, ~250ms apart, each firing
    // clearing the form — so a fill landing between them is wiped and the
    // form submits empty. Let the widget finish and exactly one callback
    // follows.
    const initialTokenHandle = await this.page.waitForFunction(
      () => {
        const browser = globalThis as unknown as RecaptchaBrowserGlobals;
        const el = browser.document.querySelector('textarea[name="g-recaptcha-response"]');
        return el && el.value.length > 0 ? el.value : false;
      },
      undefined,
      { timeout: 25_000, polling: 100 }
    );
    const initialToken = await initialTokenHandle.jsonValue();

    // 3. Trigger verification.
    await this.page.evaluate(async () => {
      const browser = globalThis as unknown as RecaptchaBrowserGlobals;
      const [id] = Object.keys(browser.___grecaptcha_cfg?.clients ?? {});
      await browser.grecaptcha!.execute!(Number(id));
    });

    // 4. The token differing from step 2's baseline *is* our callback having
    // fired — the same event that sets the form's captchaVerified flag and
    // clears the inputs. Once seen, the form is verified and safe to fill.
    await this.page.waitForFunction(
      (previousToken) => {
        const browser = globalThis as unknown as RecaptchaBrowserGlobals;
        const el = browser.document.querySelector('textarea[name="g-recaptcha-response"]');
        return !!el && el.value.length > 0 && el.value !== previousToken;
      },
      initialToken,
      { timeout: 25_000, polling: 100 }
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/register'); // relative to use.baseURL — never a hardcoded demoqa.com URL
  }

  async fillDetails({ firstName, lastName, userName, password }: RegisterDetails): Promise<void> {
    const timeout = RegisterPage.STEP_TIMEOUT_MS;
    await this.firstNameInput.fill(firstName, { timeout });
    await this.lastNameInput.fill(lastName, { timeout });
    await this.userNameInput.fill(userName, { timeout });
    await this.passwordInput.fill(password, { timeout });
  }

  async clickRegister(): Promise<void> {
    await this.registerButton.click({ timeout: RegisterPage.STEP_TIMEOUT_MS });
  }

  // For any case that must reach the server. Verification comes before the
  // fill — see triggerInvisibleRecaptcha() for both halves of why.
  async registerAs(details: RegisterDetails): Promise<void> {
    await this.goto();
    await this.triggerInvisibleRecaptcha();
    await this.fillDetails(details);
    await this.clickRegister();
  }

  // For cases the form rejects on its required-field check, which never reach
  // the server. The guard is
  // `allFieldsPresent ? captchaVerified ? …POST… : "verify reCaptcha" : fieldErrors`,
  // so a blank field never consults the captcha flag — skipping verification
  // is correct here, and ~1.5s rather than ~11s.
  //
  // A separate method rather than a flag on registerAs(): skipping is only
  // valid when the submission is expected to be blocked client-side, and that
  // precondition belongs at the call site.
  async registerExpectingClientSideRejection(details: RegisterDetails): Promise<void> {
    await this.goto();
    await this.fillDetails(details);
    await this.clickRegister();
  }

  // The success signal is a native browser alert, not a DOM node, so it cannot
  // be located with getByText. Must be called *before* clickRegister() or
  // Playwright auto-dismisses the dialog and the message is lost. Rejects
  // rather than hanging if no alert arrives, which would otherwise surface as
  // an opaque whole-test timeout naming no step.
  captureNextDialogMessage(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = RegisterPage.DIALOG_TIMEOUT_MS;
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              `No registration dialog appeared within ${timeout}ms — the submission did not reach the server`
            )
          ),
        timeout
      );

      this.page.once('dialog', async (dialog) => {
        clearTimeout(timer);
        const message = dialog.message();
        await dialog.accept();
        resolve(message);
      });
    });
  }

  // Submitting this form *is* a POST /Account/v1/User, and its 201 body is the
  // only place a UI test can see the new account's userID — which is what lets
  // a test tear down through the API rather than /profile's Delete Account.
  // Returns the raw response; page objects don't validate shapes.
  //
  // Subscribe *before* the submission: this is a one-time event, not queryable
  // state, so it must be a listener rather than a poll.
  //
  // The path duplicates AccountApiClient's `${basePath}/User` deliberately —
  // src/ui/pages/ must not import src/api/, and one string is too thin a
  // reason for a shared layer. If the endpoint moves, the API suite fails
  // first. Revisit if a third place needs it.
  captureNextRegistrationResponse(): Promise<Response> {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/Account/v1/User') && response.request().method() === 'POST',
      { timeout: 30_000 }
    );
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
