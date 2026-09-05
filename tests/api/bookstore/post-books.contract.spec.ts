import { test, expect } from '../../../src/fixtures/book-store.fixtures';
import { buildAddBooksPayload, knownIsbns } from '../../../src/data/book-store.factory';
import { AddBooksResponseSchema } from '../../../src/types/book-store.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'POST /BookStore/v1/Books success response matches schema',
  { tag: ['@contract', '@POST-BOOKS'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, {
      collectionOfIsbns: [{ isbn: knownIsbns.first }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);
    const body: unknown = await response.json();

    expect(response.status()).toBe(201);
    expect(body).toMatchSchema(AddBooksResponseSchema);
  }
);

test(
  'POST /BookStore/v1/Books error response matches schema',
  { tag: ['@contract', '@POST-BOOKS'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    // Representative error case — empty collectionOfIsbns (400/1207) —
    // exercises the same {code, message} shape shared by every error case
    // this endpoint returns (1200, 1205, 1207, 1210).
    const payload = buildAddBooksPayload(seedUserForBooks.userId, { collectionOfIsbns: [] });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);
    const body: unknown = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
