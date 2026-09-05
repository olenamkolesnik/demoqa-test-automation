import { test as base } from '@playwright/test';
import { BookStoreApiClient } from '../api/book-store-api.client';

interface BookStoreFixtures {
  bookStoreApiClient: BookStoreApiClient;
}

export const test = base.extend<BookStoreFixtures>({
  bookStoreApiClient: async ({ request }, use) => {
    await use(new BookStoreApiClient(request));
  },
});

export { expect } from '@playwright/test';
