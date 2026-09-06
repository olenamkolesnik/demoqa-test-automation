import { test, expect } from '../../../src/fixtures/book-store.fixtures';
import { unknownUserId } from '../../../src/data/book-store.factory';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'DELETE /BookStore/v1/Books success response has an empty body',
  { tag: ['@contract', '@DELETE-BOOKS'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    // No response schema applies here: success is a 204 with a genuinely
    // empty body (Swagger's BooksResult schema for this status is wrong,
    // per docs/api-spec/book-store-endpoints.md) — the contract is the
    // absence of a payload, not a shape to validate against.
    const response = await bookStoreApiClient.deleteAllBooks({
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    const bodyText = await response.text();

    expect(response.status()).toBe(204);
    expect(bodyText).toBe('');
  }
);

test(
  'DELETE /BookStore/v1/Books error response matches schema',
  { tag: ['@contract', '@DELETE-BOOKS'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    // Representative error case — unknown UserId (401/1207) — exercises the
    // same {code, message} shape shared by every error case this endpoint
    // returns (1200, 1207).
    const response = await bookStoreApiClient.deleteAllBooks({
      userId: unknownUserId,
      token: seedUserForBooks.token,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(401);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
