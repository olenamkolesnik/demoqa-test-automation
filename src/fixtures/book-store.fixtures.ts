import { test as base } from '@playwright/test';
import { BookStoreApiClient } from '../api/book-store-api.client';
import { AccountApiClient } from '../api/account-api.client';
import { buildAddBooksPayload } from '../data/book-store.factory';
import { parseJsonBody } from '../utils/api-response.util';
import { deleteSeededUser, seedAuthorizedUser } from './seed-user.util';
import { AddBooksResponseSchema } from '../types/book-store.schema';
import type { SeededAuthorizedUser } from './seed-user.util';

interface BookStoreFixtures {
  bookStoreApiClient: BookStoreApiClient;
  // Tests verifying persistence of a POST /BookStore/v1/Books write need to
  // read the user's collection back via the Account resource — provided as a
  // fixture rather than let tests `new` it directly (docs/coding-standards.md:
  // "a test never `new`s a client... directly — always go through a fixture").
  accountApiClient: AccountApiClient;
  // POST /BookStore/v1/Books requires an existing, tokenized Account user —
  // seeding that user is this resource's own precondition, so it stays a
  // BookStore-named fixture rather than reusing account.fixtures.ts's
  // seedAuthorizedUser (whose tests care about Account-specific state, e.g.
  // token presence/absence). The seeding procedure itself is shared via
  // seed-user.util.ts — only the fixture name and precondition differ.
  seedUserForBooks: SeededAuthorizedUser;
  // Same seeded user as seedUserForBooks, but with one known-good ISBN
  // already added to the collection — the precondition COND-POST-BOOKS-010
  // (duplicate ISBN) needs, seeded independently rather than depending on
  // another test's POST having already run.
  seedUserWithBook: SeededAuthorizedUser;
}

export const test = base.extend<BookStoreFixtures>({
  bookStoreApiClient: async ({ request }, use) => {
    await use(new BookStoreApiClient(request));
  },

  accountApiClient: async ({ request }, use) => {
    await use(new AccountApiClient(request));
  },

  // Teardown deletes the user only: deleting an Account user is confirmed live
  // (2026-09-07) to take their book collection with it, so an explicit
  // DELETE /BookStore/v1/Books here would be a redundant round-trip.
  seedUserForBooks: async ({ accountApiClient }, use) => {
    const { payload, userId, token } = await seedAuthorizedUser(accountApiClient);

    await use({ userName: payload.userName, password: payload.password, userId, token });

    await deleteSeededUser(accountApiClient, payload, userId, token);
  },

  seedUserWithBook: async ({ accountApiClient, bookStoreApiClient }, use) => {
    const { payload, userId, token } = await seedAuthorizedUser(accountApiClient);

    const addResponse = await bookStoreApiClient.addBooks({
      payload: buildAddBooksPayload(userId),
      token,
    });
    await parseJsonBody(addResponse, AddBooksResponseSchema);

    await use({ userName: payload.userName, password: payload.password, userId, token });

    await deleteSeededUser(accountApiClient, payload, userId, token);
  },
});

export { expect } from '@playwright/test';
