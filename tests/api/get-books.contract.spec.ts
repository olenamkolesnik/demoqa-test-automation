import { test, expect } from '../../src/fixtures/book-store.fixtures';
import { AllBooksResponseSchema } from '../../src/types/book-store.schema';

test(
  'GET /BookStore/v1/Books success response matches schema',
  { tag: ['@contract', '@GET-BOOKS'] },
  async ({ bookStoreApiClient }) => {
    // Only one response shape exists for this endpoint — it takes no params
    // and no auth, and docs/api-spec/book-store-endpoints.md confirms no
    // error cases, so there is no error shape to cover here.
    const response = await bookStoreApiClient.getBooks();
    const body: unknown = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchSchema(AllBooksResponseSchema);
  }
);
