import { test, expect } from '../../src/fixtures/book-store.fixtures';
import { parseJsonBody } from '../../src/utils/api-response.util';
import { AllBooksResponseSchema } from '../../src/types/book-store.schema';

test(
  'Get book list without authentication token',
  { tag: ['@GET-BOOKS-001', '@positive'] },
  async ({ bookStoreApiClient }) => {
    const response = await bookStoreApiClient.getBooks();
    const body = await parseJsonBody(response, AllBooksResponseSchema);

    expect.soft(response.status()).toBe(200);
    expect.soft(body.books.length).toBeGreaterThan(0);
    // Asserted across every entry rather than a sampled index: the schema has
    // already guaranteed these keys exist, so what is under test here is that
    // the catalogue carries real values in them, not placeholder blanks.
    expect.soft(body.books.every((book) => book.isbn && book.title && book.author)).toBe(true);
  }
);
