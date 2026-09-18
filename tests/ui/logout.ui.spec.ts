import { mergeTests } from '@playwright/test';
import { test as accountTest, expect } from '../../src/fixtures/account.fixtures';
import { test as uiPageTest } from '../../src/fixtures/ui-page.fixtures';

const test = mergeTests(accountTest, uiPageTest);

// Every test here signs in through the login form first, then verifies what
// logging out changes. The account is seeded via seedUser; the session itself
// cannot be — DemoQA carries it in cookies set by a real authentication
// response, not by anything an API-issued token can inject into the browser
// (docs/ui-spec/login-form.requirements.md, "Constraint on test design").
//
// LOGOUT-008 (COND-LOGOUT-012, catalogue stays readable) and LOGOUT-009
// (COND-LOGOUT-013, no server request) are Low priority and filtered from
// automation per the priority rule. LOGOUT-009 would also be out of scope on
// its own terms: its entire assertion is "no request was made to demoqa.com",
// and this suite does not assert on network traffic even where a test case's
// own Notes suggest it (generate-ui-tests skill, "Reading the Notes field").
// Both remain manually verified — see docs/test-cases/ui/auth/logout.md.

test.describe('Logout', () => {
  test(
    'Log out from the profile page',
    { tag: ['@LOGOUT-001', '@state-transition'] },
    async ({ page, loginPage, profilePage, seedUser }) => {
      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
      await page.waitForURL(/\/profile$/);

      await expect.soft(profilePage.userName()).toHaveText(seedUser.userName);
      await expect.soft(profilePage.logOutButton()).toBeVisible();

      await profilePage.clickLogOut();

      await expect.soft(page).toHaveURL(/\/login$/);
      await expect.soft(loginPage.usernameField()).toBeVisible();
      await expect.soft(loginPage.passwordField()).toBeVisible();
      await expect.soft(profilePage.userName()).toHaveCount(0);
      await expect.soft(profilePage.logOutButton()).toHaveCount(0);
    }
  );

  test(
    'Log out from the book store page',
    { tag: ['@LOGOUT-002', '@state-transition'] },
    async ({ page, loginPage, booksPage, seedUser }) => {
      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
      await page.waitForURL(/\/profile$/);
      await booksPage.goto();

      await expect.soft(booksPage.userName()).toHaveText(seedUser.userName);
      await expect.soft(booksPage.logOutButton()).toBeVisible();

      await booksPage.clickLogOut();

      await expect.soft(page).toHaveURL(/\/login$/);
      await expect.soft(booksPage.userName()).toHaveCount(0);
      await expect.soft(booksPage.logOutButton()).toHaveCount(0);
    }
  );

  test(
    'Verify session cookies are cleared by logout',
    { tag: ['@LOGOUT-003', '@state-transition'] },
    async ({ page, context, loginPage, profilePage, seedUser }) => {
      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
      await page.waitForURL(/\/profile$/);

      const authCookieNames = ['token', 'expires', 'userID', 'userName'];
      const cookiesBefore = (await context.cookies()).map((c) => c.name);
      expect(authCookieNames.every((name) => cookiesBefore.includes(name))).toBe(true);

      await profilePage.clickLogOut();
      await page.waitForURL(/\/login$/);

      const cookiesAfter = (await context.cookies()).map((c) => c.name);
      expect(authCookieNames.some((name) => cookiesAfter.includes(name))).toBe(false);
    }
  );

  test(
    'End a session by clearing its cookies',
    { tag: ['@LOGOUT-004', '@state-transition'] },
    async ({ page, context, loginPage, profilePage, seedUser }) => {
      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
      await page.waitForURL(/\/profile$/);

      await context.clearCookies();
      await profilePage.goto();

      await expect.soft(profilePage.signedOutMessage()).toBeVisible();
      await expect.soft(profilePage.buttons()).toHaveCount(0);
    }
  );

  test(
    'Press the browser Back button after logging out',
    { tag: ['@LOGOUT-005', '@state-transition'] },
    async ({ page, loginPage, profilePage, seedUser }) => {
      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
      await page.waitForURL(/\/profile$/);

      await profilePage.clickLogOut();
      await page.waitForURL(/\/login$/);

      await page.goBack();
      await page.waitForURL(/\/profile$/);

      await expect.soft(profilePage.signedOutMessage()).toBeVisible();
      await expect.soft(profilePage.userName()).toHaveCount(0);
      await expect.soft(profilePage.logOutButton()).toHaveCount(0);
    }
  );

  test(
    'Confirm no logout control is offered without a session',
    { tag: ['@LOGOUT-006', '@negative'] },
    async ({ profilePage, booksPage, loginPage }) => {
      await profilePage.goto();
      await expect.soft(profilePage.buttons()).toHaveCount(0);

      await booksPage.goto();
      await expect.soft(booksPage.loginButton()).toBeVisible();
      await expect.soft(booksPage.logOutButton()).toHaveCount(0);

      await loginPage.goto();
      await expect.soft(loginPage.usernameField()).toBeVisible();
      await expect.soft(loginPage.logOutButton()).toHaveCount(0);
    }
  );

  test(
    'Open the profile page without a session',
    { tag: ['@LOGOUT-007', '@negative'] },
    async ({ page, profilePage, loginPage, seedUser }) => {
      await profilePage.goto();

      await expect.soft(page).toHaveURL(/\/profile$/);
      await expect.soft(profilePage.signedOutMessage()).toBeVisible();
      await expect.soft(profilePage.buttons()).toHaveCount(0);

      await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
      await page.waitForURL(/\/profile$/);
      await profilePage.clickLogOut();
      await page.waitForURL(/\/login$/);

      await profilePage.goto();
      await expect.soft(page).toHaveURL(/\/profile$/);
      await expect.soft(profilePage.signedOutMessage()).toBeVisible();
      await expect.soft(profilePage.buttons()).toHaveCount(0);
    }
  );
});
