import { test as base } from '@playwright/test';
import { BookStoreApiClient } from '../api/book-store-api.client';
import { AccountApiClient } from '../api/account-api.client';
import { buildNewUserPayload } from '../data/user.factory';
import { knownIsbns } from '../data/book-store.factory';
import { parseJsonBody } from '../utils/api-response.util';
import { logger } from '../utils/logger';
import { deleteAndLogOrphanOnFailure } from './teardown.util';
import {
  CreateUserResponseSchema,
  GenerateTokenResponseSchema,
  GetUserResponseSchema,
} from '../types/account.schema';
import { AddBooksResponseSchema } from '../types/book-store.schema';
import type { LoginPayload } from '../types/account.schema';

interface SeededAuthorizedUser {
  userName: string;
  password: string;
  userId: string;
  token: string;
}

interface BookStoreFixtures {
  bookStoreApiClient: BookStoreApiClient;
  // Tests verifying persistence of a POST /BookStore/v1/Books write need to
  // read the user's collection back via the Account resource — provided as a
  // fixture rather than let tests `new` it directly (docs/coding-standards.md:
  // "a test never `new`s a client... directly — always go through a fixture").
  accountApiClient: AccountApiClient;
  // POST /BookStore/v1/Books requires an existing, tokenized Account user —
  // seeding that user is this resource's own precondition, so it belongs
  // here rather than duplicating account.fixtures.ts's seedAuthorizedUser
  // (which that file's tests use for Account-specific state, e.g. token
  // presence/absence — not relevant to BookStore's own test cases).
  seedUserForBooks: SeededAuthorizedUser;
  // Same seeded user as seedUserForBooks, but with one known-good ISBN
  // already added to the collection — the precondition COND-POST-BOOKS-010
  // (duplicate ISBN) needs, seeded independently rather than depending on
  // another test's POST having already run.
  seedUserWithBook: SeededAuthorizedUser;
}

async function deleteUserAndLogOrphanOnFailure(
  client: AccountApiClient,
  payload: LoginPayload,
  userId: string,
  token: string
): Promise<void> {
  await deleteAndLogOrphanOnFailure(
    () => client.deleteUser({ userId, token }),
    () => `orphaned userId=${userId} userName=${payload.userName} (BookStore fixture)`,
    204
  );
}

async function seedAuthorizedUser(accountApiClient: AccountApiClient): Promise<{
  payload: LoginPayload;
  userId: string;
  token: string;
}> {
  const payload = buildNewUserPayload();
  const createResponse = await accountApiClient.createUser(payload);
  const created = await parseJsonBody(createResponse, CreateUserResponseSchema);
  const tokenResponse = await accountApiClient.generateToken(payload);
  const { token } = await parseJsonBody(tokenResponse, GenerateTokenResponseSchema);

  if (!token) {
    logger.error(
      `seedUserForBooks could not acquire a token for userId=${created.userID} userName=${payload.userName}`
    );
    throw new Error('seedUserForBooks: token acquisition failed');
  }

  return { payload, userId: created.userID, token };
}

// Shared by every test that verifies a POST /BookStore/v1/Books write
// actually persisted, rather than trusting the response echo (which
// docs/api-spec/book-store-endpoints.md documents as unreliable for a
// partial batch — see COND-POST-BOOKS-009).
export async function getUserBookIsbns(
  accountApiClient: AccountApiClient,
  { userId, token }: { userId: string; token: string }
): Promise<string[]> {
  const response = await accountApiClient.getUser({ userId, token });
  const userState = await parseJsonBody(response, GetUserResponseSchema);
  return userState.books.map((book) => book.isbn);
}

export const test = base.extend<BookStoreFixtures>({
  bookStoreApiClient: async ({ request }, use) => {
    await use(new BookStoreApiClient(request));
  },

  accountApiClient: async ({ request }, use) => {
    await use(new AccountApiClient(request));
  },

  seedUserForBooks: async ({ accountApiClient }, use) => {
    const { payload, userId, token } = await seedAuthorizedUser(accountApiClient);

    await use({ userName: payload.userName, password: payload.password, userId, token });

    await deleteUserAndLogOrphanOnFailure(accountApiClient, payload, userId, token);
  },

  seedUserWithBook: async ({ accountApiClient, bookStoreApiClient }, use) => {
    const { payload, userId, token } = await seedAuthorizedUser(accountApiClient);

    const addResponse = await bookStoreApiClient.addBooks(
      { userId, collectionOfIsbns: [{ isbn: knownIsbns.first }] },
      token
    );
    await parseJsonBody(addResponse, AddBooksResponseSchema);

    await use({ userName: payload.userName, password: payload.password, userId, token });

    await deleteUserAndLogOrphanOnFailure(accountApiClient, payload, userId, token);
  },
});

export { expect } from '@playwright/test';
