import { mergeTests } from '@playwright/test';
import { test as accountTest, expect } from '../../src/fixtures/account.fixtures';
import { test as uiPageTest } from '../../src/fixtures/ui-page.fixtures';
import { RegistrationFlow } from '../../src/ui/flows/registration.flow';
import { logger } from '../../src/utils/logger';

const test = mergeTests(accountTest, uiPageTest);

// Two constraints apply to every test in this file, both from
// docs/ui-spec/register-form.requirements.md:
//
// - DIVERGENCE-4: an early Register click can fail before reaching the
//   server — silently, or with #name reading "Please verify reCaptcha to
//   register!" — because reCAPTCHA has not finished initialising. Manual
//   testing measured this at 1 in 5 trials; under Playwright automation it
//   has instead looked deterministic (6/6 failures across repeated runs,
//   confirmed via network trace to send zero requests to /Account/v1/User).
//   REGISTER-FORM-006, -007, and -008 all submit the form and are currently
//   RED because of this — a deliberate, documented decision (see the
//   requirements doc's "Current status" note under DIVERGENCE-4), not an
//   oversight. REGISTER-FORM-007 and -008 use a one-retry tolerance
//   (RegistrationFlow) that has not been shown to help; -006 does not use it.
//   Do not weaken these three tests' assertions to force them green, and do
//   not add the same retry wrapping to -006 without revisiting this decision.
// - REGISTER-FORM-009 (COND-REGISTER-FORM-009) is deliberately NOT automated
//   here. It is provisional pending DIVERGENCE-3 sign-off — see the banner at
//   the top of docs/test-conditions/ui/auth/register-form.md. Do not add it
//   until that decision is taken.
//
// REGISTER-FORM-012 (Low priority) is filtered per generate-ui-tests's
// priority filter and stays manual.

test.describe('Registration form', () => {
  test(
    'Submit the form with the first name missing',
    { tag: ['@REGISTER-FORM-001', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerAs({
        firstName: '',
        lastName: 'Lovelace',
        userName: 'qa_reg_req_001',
        password: 'Aa1!aaaaaaaa',
      });

      // is-invalid is the only signal for this blocked state — no message, no
      // aria-invalid, nothing in the accessibility tree (DIVERGENCE-1,
      // docs/ui-spec/register-form.requirements.md). Documented exception to
      // the locator-priority rule in docs/coding-standards.md.
      await expect.soft(registerPage.firstNameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.lastNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.usernameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.passwordField()).not.toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with the last name missing',
    { tag: ['@REGISTER-FORM-002', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerAs({
        firstName: 'Ada',
        lastName: '',
        userName: 'qa_reg_req_002',
        password: 'Aa1!aaaaaaaa',
      });

      await expect.soft(registerPage.lastNameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.firstNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.usernameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.passwordField()).not.toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with the username missing',
    { tag: ['@REGISTER-FORM-003', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerAs({
        firstName: 'Ada',
        lastName: 'Lovelace',
        userName: '',
        password: 'Aa1!aaaaaaaa',
      });

      await expect.soft(registerPage.usernameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.firstNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.lastNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.passwordField()).not.toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with the password missing',
    { tag: ['@REGISTER-FORM-004', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerAs({
        firstName: 'Ada',
        lastName: 'Lovelace',
        userName: 'qa_reg_req_004',
        password: '',
      });

      await expect.soft(registerPage.passwordField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.firstNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.lastNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.usernameField()).not.toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with every field empty',
    { tag: ['@REGISTER-FORM-005', '@boundary'] },
    async ({ registerPage }) => {
      await registerPage.registerAs({
        firstName: '',
        lastName: '',
        userName: '',
        password: '',
      });

      // All four marked at once is what shows the check is per-field rather
      // than form-wide — the reason this case exists alongside 001-004.
      await expect.soft(registerPage.firstNameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.lastNameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.usernameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.passwordField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with whitespace-only values',
    { tag: ['@REGISTER-FORM-006', '@boundary'] },
    async ({ registerPage }) => {
      await registerPage.registerAs({
        firstName: '   ',
        lastName: '   ',
        userName: '   ',
        password: '   ',
      });

      // Contrast REGISTER-FORM-005: whitespace is a value, so the required
      // check passes and the server rejects on the password rule instead —
      // same message REGISTER-FORM-008 reaches by a different route.
      await expect
        .soft(registerPage.errorMessage())
        .toHaveText(
          "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer."
        );
      await expect.soft(registerPage.firstNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.lastNameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.usernameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(registerPage.passwordField()).not.toHaveClass(/is-invalid/);
    }
  );

  test(
    'Register with valid details',
    { tag: ['@REGISTER-FORM-007', '@positive'] },
    async ({ page, registerPage }) => {
      // Random suffix so the account genuinely does not exist on the shared
      // backend, and so this run doesn't hit REGISTER-FORM-009's duplicate
      // path on a re-run.
      const userName = `qa_reg_ok_${Date.now()}`;
      const password = 'Aa1!aaaaaaaa';
      const flow = new RegistrationFlow(page);

      // Tolerates DIVERGENCE-4 (reCAPTCHA not ready on an early submission,
      // docs/ui-spec/register-form.requirements.md) with one retry — this
      // case's subject is the success dialog's text, not reCAPTCHA timing.
      const dialogMessage = await flow.registerThroughUiToleratingRecaptcha({
        firstName: 'Ada',
        lastName: 'Lovelace',
        userName,
        password,
      });

      // Teardown runs in finally, not after the assertions as a plain
      // statement: a UI-registered account's userId is never recoverable, so
      // the API delete route is unreachable — sign in and delete via
      // /profile instead (ProfilePage.deleteAccount()). This must run even
      // if an assertion below throws unexpectedly, or the account orphans on
      // the shared backend with nothing to log it (Risk-1,
      // docs/test-plan.md §8) — soft assertions can't throw, but the field
      // reads themselves could, so this isn't purely defensive.
      try {
        // The success signal is a native browser alert, not an in-page
        // element (docs/ui-spec/register-form.requirements.md, Element
        // reference).
        expect.soft(dialogMessage).toBe('User Registered Successfully.');
        await expect.soft(registerPage.firstNameField()).toHaveValue('');
        await expect.soft(registerPage.lastNameField()).toHaveValue('');
        await expect.soft(registerPage.usernameField()).toHaveValue('');
        await expect.soft(registerPage.passwordField()).toHaveValue('');
        await expect.soft(page).toHaveURL(/\/register$/);
      } finally {
        try {
          await flow.signInAndDeleteAccount(userName, password);
        } catch (error) {
          logger.error(`Teardown failed to delete orphaned userName=${userName}: ${String(error)}`);
        }
      }
    }
  );

  test(
    'Register with a password below the complexity rule',
    { tag: ['@REGISTER-FORM-008', '@negative'] },
    async ({ page }) => {
      const flow = new RegistrationFlow(page);

      // Tolerates DIVERGENCE-4 (reCAPTCHA not ready on an early submission,
      // docs/ui-spec/register-form.requirements.md) with one retry — this
      // case's subject is the password-complexity message, not reCAPTCHA
      // timing.
      const message = await flow.registerExpectingMessageToleratingRecaptcha({
        firstName: 'Ada',
        lastName: 'Lovelace',
        userName: 'qa_reg_weak_001',
        password: 'weak',
      });

      // DIVERGENCE-2: the field's complexity `pattern` attribute is
      // decorative — the form submits anyway and the server rejects it. This
      // asserts the observed server-side path, not client-side blocking.
      expect(message).toBe(
        "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer."
      );
    }
  );

  test(
    'Correct a rejected submission without retyping',
    { tag: ['@REGISTER-FORM-010', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerAs({
        firstName: 'Ada',
        lastName: 'Lovelace',
        userName: 'qa_reg_keep_001',
        password: 'weak',
      });

      // Contrast REGISTER-FORM-007: a success clears the form, a rejection
      // preserves it so the user can fix one field rather than start again.
      await expect.soft(registerPage.firstNameField()).toHaveValue('Ada');
      await expect.soft(registerPage.lastNameField()).toHaveValue('Lovelace');
      await expect.soft(registerPage.usernameField()).toHaveValue('qa_reg_keep_001');
      await expect.soft(registerPage.passwordField()).toHaveValue('weak');
    }
  );

  test(
    'Return to the login form from registration',
    { tag: ['@REGISTER-FORM-011', '@state-transition'] },
    async ({ page, registerPage }) => {
      await registerPage.goto();
      await registerPage.clickBackToLogin();

      await expect(page).toHaveURL(/\/login$/);
    }
  );
});
