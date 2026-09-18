import { test as base } from '@playwright/test';
import { BooksPage, LoginPage, ProfilePage, RegisterPage } from '../ui/pages';

// One fixture per page object, mirroring how account.fixtures.ts wraps
// `request` into accountApiClient: a UI spec asks for the page it needs by
// name instead of constructing it from `page` in every test.
interface UiPageFixtures {
  booksPage: BooksPage;
  loginPage: LoginPage;
  profilePage: ProfilePage;
  registerPage: RegisterPage;
}

export const test = base.extend<UiPageFixtures>({
  booksPage: async ({ page }, use) => {
    await use(new BooksPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
});

export { expect } from '@playwright/test';
