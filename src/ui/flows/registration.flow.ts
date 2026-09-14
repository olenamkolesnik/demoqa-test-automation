import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ProfilePage } from '../pages/profile.page';
import { RegisterPage, type RegisterDetails } from '../pages/register.page';

// Composes page objects across /register, /login, and /profile; holds no
// locators of its own and never asserts (docs/coding-standards.md, UI test
// architecture). Exists because REGISTER-FORM-007's teardown genuinely spans
// three pages: registering through the UI never surfaces the created
// account's userId, so the only way to delete it is signing in and using
// /profile's own Delete Account control (see ProfilePage.deleteAccount()).
export class RegistrationFlow {
  constructor(private readonly page: Page) {}

  // Registers through the form and returns the captured success-alert
  // message, so the caller can assert it without this flow asserting on the
  // caller's behalf.
  async registerThroughUi(details: RegisterDetails): Promise<string> {
    const registerPage = new RegisterPage(this.page);
    const dialogMessage = registerPage.captureNextDialogMessage();
    await registerPage.registerAs(details);
    return dialogMessage;
  }

  // DIVERGENCE-4 (docs/ui-spec/register-form.requirements.md): an early
  // registration submission can fail before reaching the server because
  // reCAPTCHA has not finished initialising — silently (no dialog ever
  // fires) or with #name reading RegisterPage.RECAPTCHA_NOT_READY_MESSAGE.
  // Both are known, intermittent, non-regression outcomes, confirmed by
  // network trace to send zero requests to /Account/v1/User. This retries
  // registerThroughUi once when either shape is detected, so a case whose
  // actual subject is something else (the success dialog's text) is not
  // reported as failing when the real cause is reCAPTCHA timing.
  //
  // A single retry, not a loop: DIVERGENCE-4's own measurement (1 silent
  // no-op in 5 trials) makes a second attempt overwhelmingly likely to reach
  // the server; retrying indefinitely would turn a real, permanent form
  // regression into a hang instead of a failure.
  async registerThroughUiToleratingRecaptcha(details: RegisterDetails): Promise<string> {
    const registerPage = new RegisterPage(this.page);

    for (let attempt = 1; attempt <= 2; attempt++) {
      const dialogMessage = registerPage.captureNextDialogMessage();
      await registerPage.registerAs(details);

      const raced = await Promise.race([
        dialogMessage.then((message) => ({ gotDialog: true as const, message })),
        registerPage
          .errorMessage()
          .filter({ hasText: RegisterPage.RECAPTCHA_NOT_READY_MESSAGE })
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => ({ gotDialog: false as const, message: '' }))
          .catch(() => ({ gotDialog: false as const, message: '' })),
      ]);

      if (raced.gotDialog) {
        return raced.message;
      }

      if (attempt === 2) {
        throw new Error(
          `Registration submission hit DIVERGENCE-4 (reCAPTCHA not ready) on both attempts for userName=${details.userName}`
        );
      }
      // Retry: DIVERGENCE-4 is tied to a cold page's reCAPTCHA state, so
      // registerThroughUi's own registerAs() reloading /register fresh is
      // exactly the right reset before trying again.
    }

    // Unreachable — the loop always returns or throws — but keeps TypeScript
    // satisfied that every path returns a string.
    throw new Error('unreachable');
  }

  // Same DIVERGENCE-4 tolerance as registerThroughUiToleratingRecaptcha,
  // shaped for a case whose expected outcome is a specific in-page #name
  // message rather than the success dialog (e.g. REGISTER-FORM-008's
  // password-complexity rejection). Retries once if #name instead reads
  // RegisterPage.RECAPTCHA_NOT_READY_MESSAGE; returns whatever #name actually
  // shows otherwise, for the caller to assert.
  async registerExpectingMessageToleratingRecaptcha(details: RegisterDetails): Promise<string> {
    const registerPage = new RegisterPage(this.page);

    for (let attempt = 1; attempt <= 2; attempt++) {
      await registerPage.registerAs(details);
      await registerPage.errorMessage().waitFor({ state: 'visible' });
      const message = (await registerPage.errorMessage().textContent()) ?? '';

      if (message !== RegisterPage.RECAPTCHA_NOT_READY_MESSAGE) {
        return message;
      }

      if (attempt === 2) {
        throw new Error(
          `Registration submission hit DIVERGENCE-4 (reCAPTCHA not ready) on both attempts for userName=${details.userName}`
        );
      }
    }

    throw new Error('unreachable');
  }

  // Signs in as the given credentials and deletes the account from /profile.
  // The only teardown route for an account with no recoverable userId.
  async signInAndDeleteAccount(userName: string, password: string): Promise<void> {
    const loginPage = new LoginPage(this.page);
    await loginPage.loginAs({ userName, password });

    const profilePage = new ProfilePage(this.page);
    await profilePage.goto();
    await profilePage.deleteAccount();
  }
}
