import { test, expect } from '../../../src/fixtures/book-store.fixtures';
import { knownIsbns, unknownIsbn } from '../../../src/data/book-store.factory';
import { ReplaceBookResponseSchema } from '../../../src/types/book-store.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'PUT /BookStore/v1/Books/{ISBN} success response matches schema',
  { tag: ['@contract', '@PUT-BOOKS'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: seedUserWithBook.userId, isbn: knownIsbns.second },
      token: seedUserWithBook.token,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchSchema(ReplaceBookResponseSchema);
  }
);

test(
  'PUT /BookStore/v1/Books/{ISBN} error response matches schema',
  { tag: ['@contract', '@PUT-BOOKS'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    // Representative error case — body isbn unknown to catalogue (400/1205) —
    // exercises the same {code, message} shape shared by every error case
    // this endpoint returns (1205, 1206, 1207 under 400, 1207 and 1200 under
    // 401 all share this shape).
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: seedUserWithBook.userId, isbn: unknownIsbn },
      token: seedUserWithBook.token,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
