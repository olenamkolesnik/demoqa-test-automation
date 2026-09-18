import { mergeTests } from '@playwright/test';
import { test as accountTest, expect } from '../../src/fixtures/account.fixtures';
import { test as uiPageTest } from '../../src/fixtures/ui-page.fixtures';
import type { SeededUser } from '../../src/fixtures/seed-user.util';

const mergedTest = mergeTests(accountTest, uiPageTest);

// Composes seedUser (API chain) with loginPage.loginAs() (UI chain). Kept
// here rather than in src/fixtures/*.ts because those files must not cross
// chains (docs/coding-standards.md, "the two chains meet only at tests/").
const test = mergedTest.extend<{ signedInSession: SeededUser }>({
  signedInSession: async ({ page, loginPage, seedUser }, use) => {
    await loginPage.loginAs({ userName: seedUser.userName, password: seedUser.password });
    await page.waitForURL(/\/profile$/);
    await use(seedUser);
  },
});

// LOGOUT-006 through 009 have no test here despite tracing to real
// conditions: 008/009 are Low priority (filtered); 006/007 never call
// clickLogOut() as the thing under test — they assert what a signed-out page
// renders, not what logging out produces. All four remain manually verified
// — see docs/test-cases/ui/auth/logout.md's Automation field for each.

test.describe('Logout', () => {
  test(
    'Log out from the profile page',
    { tag: ['@LOGOUT-001', '@state-transition'] },
    async ({ page, loginPage, profilePage, signedInSession }) => {
      await expect.soft(profilePage.userName()).toHaveText(signedInSession.userName);
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
    async ({ page, booksPage, signedInSession }) => {
      await booksPage.goto();

      await expect.soft(booksPage.userName()).toHaveText(signedInSession.userName);
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
    async ({ page, context, profilePage, signedInSession }) => {
      const authCookieNames = ['token', 'expires', 'userID', 'userName'];
      const cookieNamesBefore = (await context.cookies()).map((c) => c.name);
      for (const name of authCookieNames) {
        expect.soft(cookieNamesBefore).toContain(name);
      }
      const userIdCookie = (await context.cookies()).find((c) => c.name === 'userID');
      expect.soft(userIdCookie?.value).toBe(signedInSession.userId);

      await profilePage.clickLogOut();
      await page.waitForURL(/\/login$/);

      const cookieNamesAfter = (await context.cookies()).map((c) => c.name);
      for (const name of authCookieNames) {
        expect.soft(cookieNamesAfter).not.toContain(name);
      }
    }
  );

  test(
    'End a session by clearing its cookies',
    { tag: ['@LOGOUT-004', '@state-transition'] },
    async ({ context, profilePage, signedInSession }) => {
      void signedInSession;
      await context.clearCookies();
      await profilePage.goto();

      await expect.soft(profilePage.signedOutMessage()).toBeVisible();
      await expect.soft(profilePage.buttons()).toHaveCount(0);
    }
  );

  test(
    'Press the browser Back button after logging out',
    { tag: ['@LOGOUT-005', '@state-transition'] },
    async ({ page, profilePage, signedInSession }) => {
      void signedInSession;
      await profilePage.clickLogOut();
      await page.waitForURL(/\/login$/);

      await page.goBack();
      await page.waitForURL(/\/profile$/);

      await expect.soft(profilePage.signedOutMessage()).toBeVisible();
      await expect.soft(profilePage.userName()).toHaveCount(0);
      await expect.soft(profilePage.logOutButton()).toHaveCount(0);
    }
  );
});
