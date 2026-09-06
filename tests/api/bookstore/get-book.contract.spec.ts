import { test, expect } from '../../../src/fixtures/book-store.fixtures';
import { knownIsbns, unknownIsbn } from '../../../src/data/book-store.factory';
import { BookSchema } from '../../../src/types/book-store.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'GET /BookStore/v1/Book success response matches schema',
  { tag: ['@contract', '@GET-BOOK'] },
  async ({ bookStoreApiClient }) => {
    const response = await bookStoreApiClient.getBook(knownIsbns.first);
    const body: unknown = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchSchema(BookSchema);
  }
);

test(
  'GET /BookStore/v1/Book error response matches schema',
  { tag: ['@contract', '@GET-BOOK'] },
  async ({ bookStoreApiClient }) => {
    // Representative error case — unknown ISBN (400/1205) — exercises the
    // same {code, message} shape shared by every error case this endpoint
    // returns (empty, malformed, or unknown ISBN all collapse to it).
    const response = await bookStoreApiClient.getBook(unknownIsbn);
    const body: unknown = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
