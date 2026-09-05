import { test, expect, getUserBookIsbns } from '../../../src/fixtures/book-store.fixtures';
import {
  buildAddBooksPayload,
  knownIsbns,
  unknownIsbn,
  unknownUserId,
} from '../../../src/data/book-store.factory';
import { parseJsonBody } from '../../../src/utils/api-response.util';
import { AddBooksResponseSchema } from '../../../src/types/book-store.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  "Add a single valid book to the user's own collection",
  { tag: ['@POST-BOOKS-001', '@positive'] },
  async ({ bookStoreApiClient, seedUserForBooks, accountApiClient }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, {
      collectionOfIsbns: [{ isbn: knownIsbns.first }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);

    expect.soft(response.status()).toBe(201);
    const body = await parseJsonBody(response, AddBooksResponseSchema);
    expect.soft(body).toEqual({ books: [{ isbn: knownIsbns.first }] });

    // Verifies persistence rather than trusting the 201 echo — POST-BOOKS-009
    // shows the response body can echo an ISBN that was never actually stored.
    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserForBooks.userId,
      token: seedUserForBooks.token,
    });
    expect.soft(isbns).toContain(knownIsbns.first);
  }
);

test(
  'Add two valid books in a single request',
  { tag: ['@POST-BOOKS-002', '@positive'] },
  async ({ bookStoreApiClient, seedUserForBooks, accountApiClient }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, {
      collectionOfIsbns: [{ isbn: knownIsbns.second }, { isbn: knownIsbns.third }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);

    expect.soft(response.status()).toBe(201);
    const body = await parseJsonBody(response, AddBooksResponseSchema);
    expect.soft(body).toEqual({ books: [{ isbn: knownIsbns.second }, { isbn: knownIsbns.third }] });

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserForBooks.userId,
      token: seedUserForBooks.token,
    });
    expect.soft(isbns).toEqual(expect.arrayContaining([knownIsbns.second, knownIsbns.third]));
  }
);

test(
  'Add books with an empty collectionOfIsbns array',
  { tag: ['@POST-BOOKS-003', '@boundary'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, { collectionOfIsbns: [] });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('Collection of books required.');
  }
);

test(
  'Add books with the collectionOfIsbns key absent from the body',
  { tag: ['@POST-BOOKS-004', '@negative'] },
  async ({ seedUserForBooks, request }) => {
    // Raw request, not bookStoreApiClient.addBooks: AddBooksPayload requires
    // collectionOfIsbns, and this case needs the key entirely absent from the
    // body — the server crashes (500, HTML body) rather than validating it.
    const response = await request.post('/BookStore/v1/Books', {
      data: { userId: seedUserForBooks.userId },
      headers: { Authorization: `Bearer ${seedUserForBooks.token}` },
    });
    const bodyText = await response.text();

    expect.soft(response.status()).toBe(500);
    expect.soft(bodyText).toContain('TypeError');
  }
);

test(
  'Add books with the userId key absent from the body',
  { tag: ['@POST-BOOKS-005', '@negative'] },
  async ({ seedUserForBooks, request }) => {
    // Raw request, not bookStoreApiClient.addBooks: AddBooksPayload requires
    // userId, and this case needs the key entirely absent from the body — the
    // server crashes (500, HTML body) rather than validating it.
    const response = await request.post('/BookStore/v1/Books', {
      data: { collectionOfIsbns: [{ isbn: knownIsbns.first }] },
      headers: { Authorization: `Bearer ${seedUserForBooks.token}` },
    });
    const bodyText = await response.text();

    expect.soft(response.status()).toBe(500);
    expect.soft(bodyText).toContain('Error');
  }
);

test(
  'Add books with an empty-string userId',
  { tag: ['@POST-BOOKS-006', '@boundary'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const payload = buildAddBooksPayload('', {
      collectionOfIsbns: [{ isbn: knownIsbns.first }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('User Id not correct!');
  }
);

test(
  'Add books with a well-formed but unknown userId',
  { tag: ['@POST-BOOKS-007', '@negative'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const payload = buildAddBooksPayload(unknownUserId, {
      collectionOfIsbns: [{ isbn: knownIsbns.first }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('User Id not correct!');
  }
);

test(
  'Add a book with an ISBN not present in the catalogue',
  { tag: ['@POST-BOOKS-008', '@negative'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, {
      collectionOfIsbns: [{ isbn: unknownIsbn }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1205');
    expect.soft(error.message).toBe('ISBN supplied is not available in Books Collection!');
  }
);

test(
  'Add a batch mixing a valid and an unknown ISBN',
  { tag: ['@POST-BOOKS-009', '@negative'] },
  async ({ bookStoreApiClient, seedUserForBooks, accountApiClient }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, {
      collectionOfIsbns: [{ isbn: knownIsbns.first }, { isbn: unknownIsbn }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserForBooks.token);

    // Documents current (non-atomic) behavior: the response echoes both
    // ISBNs, but only the valid one is actually persisted — verified below.
    expect.soft(response.status()).toBe(201);
    const body = await parseJsonBody(response, AddBooksResponseSchema);
    expect.soft(body).toEqual({ books: [{ isbn: knownIsbns.first }, { isbn: unknownIsbn }] });

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserForBooks.userId,
      token: seedUserForBooks.token,
    });
    expect.soft(isbns).toContain(knownIsbns.first);
    expect.soft(isbns).not.toContain(unknownIsbn);
  }
);

test(
  "Add a book already present in the user's collection",
  { tag: ['@POST-BOOKS-010', '@negative'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    const payload = buildAddBooksPayload(seedUserWithBook.userId, {
      collectionOfIsbns: [{ isbn: knownIsbns.first }],
    });
    const response = await bookStoreApiClient.addBooks(payload, seedUserWithBook.token);
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1210');
    expect.soft(error.message).toBe("ISBN already present in the User's Collection!");
  }
);

test(
  'Add a book without an Authorization header',
  { tag: ['@POST-BOOKS-011', '@negative'] },
  async ({ bookStoreApiClient, seedUserForBooks, accountApiClient }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, {
      collectionOfIsbns: [{ isbn: knownIsbns.first }],
    });
    const response = await bookStoreApiClient.addBooks(payload, '');
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe('User not authorized!');

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserForBooks.userId,
      token: seedUserForBooks.token,
    });
    expect.soft(isbns).toEqual([]);
  }
);

test(
  'Add a book with a malformed bearer token',
  { tag: ['@POST-BOOKS-012', '@negative'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const payload = buildAddBooksPayload(seedUserForBooks.userId, {
      collectionOfIsbns: [{ isbn: knownIsbns.first }],
    });
    const response = await bookStoreApiClient.addBooks(payload, 'not-a-real-token');
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe('User not authorized!');
  }
);

// POST-BOOKS-013 ("Add a book to another user's collection using own token")
// is NOT generated here: its Preconditions require two independently seeded
// user accounts (user A and user B), and generate-api-tests does not support
// multi-actor test cases without a prior design decision on how such a
// fixture should look (e.g. a seedUserPair-style fixture). Flagged in the
// generation summary rather than attempted as a best-effort inline seed.
