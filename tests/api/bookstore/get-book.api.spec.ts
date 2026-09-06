import { test, expect } from '../../../src/fixtures/book-store.fixtures';
import { knownIsbns, unknownIsbn } from '../../../src/data/book-store.factory';
import { parseJsonBody } from '../../../src/utils/api-response.util';
import { BookSchema } from '../../../src/types/book-store.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'Get a book by a valid catalogue ISBN',
  { tag: ['@GET-BOOK-001', '@positive'] },
  async ({ bookStoreApiClient }) => {
    const response = await bookStoreApiClient.getBook(knownIsbns.first);
    const body = await parseJsonBody(response, BookSchema);

    expect.soft(response.status()).toBe(200);
    expect.soft(body.isbn).toBe(knownIsbns.first);
    expect.soft(body.title).toBe('Git Pocket Guide');
    expect.soft(body.author).toBe('Richard E. Silverman');
    expect.soft(typeof body.pages).toBe('number');
  }
);

test(
  'Get a book by a well-formed but unknown ISBN',
  { tag: ['@GET-BOOK-002', '@negative'] },
  async ({ bookStoreApiClient }) => {
    const response = await bookStoreApiClient.getBook(unknownIsbn);
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1205');
    expect.soft(error.message).toBe('ISBN supplied is not available in Books Collection!');
  }
);

test(
  'Get a book with an empty ISBN parameter',
  { tag: ['@GET-BOOK-003', '@boundary'] },
  async ({ bookStoreApiClient }) => {
    const response = await bookStoreApiClient.getBook('');
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1205');
    expect.soft(error.message).toBe('ISBN supplied is not available in Books Collection!');
  }
);

test(
  'Get a book with the ISBN query parameter absent',
  { tag: ['@GET-BOOK-005', '@negative'] },
  async ({ request }) => {
    // Raw request, not bookStoreApiClient.getBook: the client always sends
    // an ISBN param, and this case needs it structurally absent from the
    // URL — the server crashes (500, HTML body) rather than validating it,
    // unlike the empty-value case (GET-BOOK-003).
    const response = await request.get('/BookStore/v1/Book');
    const bodyText = await response.text();

    expect.soft(response.status()).toBe(500);
    expect.soft(bodyText).toContain('WHERE parameter "isbn" has invalid "undefined" value');
  }
);

test(
  'Get a book with a bogus Authorization header',
  { tag: ['@GET-BOOK-007', '@positive'] },
  async ({ request }) => {
    // Raw request: the client's getBook has no way to attach a header, and
    // this case's whole point is that the endpoint ignores one entirely.
    const response = await request.get('/BookStore/v1/Book', {
      params: { ISBN: knownIsbns.first },
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    const body = await parseJsonBody(response, BookSchema);

    expect.soft(response.status()).toBe(200);
    expect.soft(body.isbn).toBe(knownIsbns.first);
  }
);

// GET-BOOK-004 ("Get a book with a malformed ISBN") and GET-BOOK-006 ("Get a
// book using a lowercase isbn parameter") are NOT generated here: both trace
// to Low-priority conditions (COND-GET-BOOK-004, COND-GET-BOOK-006) and are
// filtered out per the automation priority filter. Both remain
// `Not automated` in docs/test-cases/api/bookstore/get-book.md.
