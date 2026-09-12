import { mergeTests } from '@playwright/test';
import { test as accountTest, expect } from '../../src/fixtures/account.fixtures';
import { test as uiPageTest } from '../../src/fixtures/ui-page.fixtures';

const test = mergeTests(accountTest, uiPageTest);

// Every test here needs a signed-out browser. Playwright gives each test its
// own context and DemoQA holds the session in React memory only, so a fresh
// context is signed out by construction — no fixture, no storageState, and
// nothing to clear. What that guarantee needs is that nothing in this file
// creates a context of its own or shares one between tests.

// REQ-LOGIN-014 ("perform required-field checks client-side, without a server
// round trip") is not asserted by any test in this file. LOGIN-FORM-001/002/003
// (blocked) and -004 (submitted) are the cases that carry it, but whether the
// form actually issued a network request is scope this UI suite has decided
// not to cover — it asserts what is visible on screen, not what crossed the
// wire. REQ-LOGIN-014 remains manually verified in
// docs/ui-spec/login-form.requirements.md; this is a deliberate, recorded gap,
// not an oversight.

test.describe('Login form', () => {
  test(
    'Submit the form with the username missing',
    { tag: ['@LOGIN-FORM-001', '@negative'] },
    async ({ loginPage }) => {
      await loginPage.loginAs({ userName: '', password: 'Aa1!aaaaaaaa' });

      await expect(loginPage.usernameField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with the password missing',
    { tag: ['@LOGIN-FORM-002', '@negative'] },
    async ({ loginPage }) => {
      await loginPage.loginAs({ userName: 'qa_user_valid', password: '' });

      await expect(loginPage.passwordField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with both fields empty',
    { tag: ['@LOGIN-FORM-003', '@boundary'] },
    async ({ loginPage }) => {
      await loginPage.goto();
      await expect.soft(loginPage.usernameField()).toHaveValue('');
      await expect.soft(loginPage.passwordField()).toHaveValue('');

      await loginPage.clickLogin();

      // Both fields marked at once is what shows the check is per-field rather
      // than form-wide — the reason this case exists alongside 001 and 002.
      await expect.soft(loginPage.usernameField()).toHaveClass(/is-invalid/);
      await expect.soft(loginPage.passwordField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with whitespace-only credentials',
    { tag: ['@LOGIN-FORM-004', '@boundary'] },
    async ({ loginPage }) => {
      await loginPage.loginAs({ userName: '   ', password: '   ' });

      // The boundary this case covers: whitespace is a value, so the required
      // check passes and the server rejects the credentials instead. Contrast
      // LOGIN-FORM-003, where the same form blocks submission entirely.
      await expect.soft(loginPage.errorMessage()).toBeVisible();
      await expect.soft(loginPage.usernameField()).not.toHaveClass(/is-invalid/);
      await expect.soft(loginPage.passwordField()).not.toHaveClass(/is-invalid/);
    }
  );

  test(
    'Log in with a correct username and password',
    { tag: ['@LOGIN-FORM-007', '@positive'] },
    async ({ page, loginPage, profilePage, seedUser }) => {
      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });

      await expect.soft(page).toHaveURL(/\/profile$/);
      await expect.soft(profilePage.userName()).toHaveText(seedUser.userName);
      await expect.soft(profilePage.logOutButton()).toBeVisible();
    }
  );

  test(
    'Log in with a username that does not exist',
    { tag: ['@LOGIN-FORM-008', '@negative'] },
    async ({ page, loginPage }) => {
      // Random suffix so the account genuinely does not exist on the shared
      // backend — a fixed name may have been registered by any other consumer.
      const userName = `qa_nonexistent_${Date.now()}`;

      await loginPage.loginAs({ userName, password: 'Aa1!aaaaaaaa' });

      await expect.soft(page).toHaveURL(/\/login$/);
      await expect.soft(loginPage.errorMessage()).toHaveText('Invalid username or password!');
    }
  );

  test(
    'Log in with the wrong password for an existing account',
    { tag: ['@LOGIN-FORM-009', '@negative'] },
    async ({ page, loginPage, seedUser }) => {
      await loginPage.loginAs({ userName: seedUser.userName, password: 'WrongPass1!' });

      await expect.soft(page).toHaveURL(/\/login$/);
      // Character-for-character identical to LOGIN-FORM-008's message: a wrong
      // password and an unknown username must stay indistinguishable, so the
      // form does not disclose which accounts exist. Asserting the exact text
      // in both places is what would catch a regression to a "helpful" message.
      await expect.soft(loginPage.errorMessage()).toHaveText('Invalid username or password!');
    }
  );

  test(
    'Submit the form using the Enter key',
    { tag: ['@LOGIN-FORM-012', '@scenario'] },
    async ({ page, loginPage }) => {
      await loginPage.goto();
      await loginPage.fillCredentials({ userName: 'qa_keyboard_001', password: 'WrongPass1!' });
      // A real key press, not a dispatched event — submitWithEnterKey uses
      // locator.press, which goes through the browser's own input pipeline.
      await loginPage.submitWithEnterKey();

      await expect.soft(page).toHaveURL(/\/login$/);
      await expect.soft(loginPage.errorMessage()).toHaveText('Invalid username or password!');
    }
  );

  test(
    'Open the login page while already signed in',
    { tag: ['@LOGIN-FORM-013', '@state-transition'] },
    async ({ page, loginPage, seedUser }) => {
      // The session has to be established through the form: DemoQA holds it in
      // React memory, so seedUser can create the account but not sign it in.
      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
      await expect(page).toHaveURL(/\/profile$/);

      await loginPage.goto();

      await expect.soft(loginPage.alreadyLoggedInMessage()).toBeVisible();
      await expect.soft(loginPage.logOutButton()).toBeVisible();
      await expect.soft(loginPage.profileLink()).toBeVisible();
      await expect.soft(loginPage.usernameField()).toHaveCount(0);
      await expect.soft(loginPage.passwordField()).toHaveCount(0);
    }
  );
});
