import { test, expect, getUserBookIsbns } from '../../../src/fixtures/book-store.fixtures';
import { knownIsbns, unknownUserId } from '../../../src/data/book-store.factory';
import { parseJsonBody } from '../../../src/utils/api-response.util';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  "Delete all books from the user's own populated collection",
  { tag: ['@DELETE-BOOKS-001', '@positive'] },
  async ({ bookStoreApiClient, seedUserWithBook, accountApiClient }) => {
    // seedUserWithBook seeds only one ISBN; a second is added here so the
    // empty-array assertion below can only pass if the whole collection is
    // cleared, not merely the first book — the distinction this test case
    // exists to prove (see COND-DELETE-BOOKS-004's Notes).
    const addResponse = await bookStoreApiClient.addBooks(
      { userId: seedUserWithBook.userId, collectionOfIsbns: [{ isbn: knownIsbns.second }] },
      seedUserWithBook.token
    );
    expect.soft(addResponse.status()).toBe(201);

    const response = await bookStoreApiClient.deleteAllBooks({
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    const bodyText = await response.text();

    expect.soft(response.status()).toBe(204);
    expect.soft(bodyText).toBe('');

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toEqual([]);
  }
);

test(
  'Delete all books from a collection that is already empty',
  { tag: ['@DELETE-BOOKS-002', '@boundary'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const response = await bookStoreApiClient.deleteAllBooks({
      userId: seedUserForBooks.userId,
      token: seedUserForBooks.token,
    });
    const bodyText = await response.text();

    expect.soft(response.status()).toBe(204);
    expect.soft(bodyText).toBe('');
  }
);

test(
  'Repeat a successful delete-all request',
  { tag: ['@DELETE-BOOKS-003', '@positive'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    const firstResponse = await bookStoreApiClient.deleteAllBooks({
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(firstResponse.status()).toBe(204);
    expect.soft(await firstResponse.text()).toBe('');

    // Not idempotent's opposite case: DELETE /Account/v1/User returns
    // 200/1207 on a repeat, but this endpoint is confirmed idempotent —
    // see docs/api-spec/book-store-endpoints.md, live check 2026-09-06.
    const secondResponse = await bookStoreApiClient.deleteAllBooks({
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(secondResponse.status()).toBe(204);
    expect.soft(await secondResponse.text()).toBe('');
  }
);

test(
  'Delete all books with the UserId query parameter absent',
  { tag: ['@DELETE-BOOKS-004', '@negative'] },
  async ({ seedUserForBooks, request }) => {
    // Raw request, not bookStoreApiClient.deleteAllBooks: the client always
    // sends a UserId param, and this case needs the query parameter entirely
    // absent from the URL — unlike POST /BookStore/v1/Books, an absent key
    // here is validated (401/1207), not crashed into a 500.
    const response = await request.delete('/BookStore/v1/Books', {
      headers: { Authorization: `Bearer ${seedUserForBooks.token}` },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('User Id not correct!');
  }
);

test(
  'Delete all books with an empty-string UserId',
  { tag: ['@DELETE-BOOKS-005', '@boundary'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const response = await bookStoreApiClient.deleteAllBooks({
      userId: '',
      token: seedUserForBooks.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('User Id not correct!');
  }
);

test(
  'Delete all books with a well-formed but unknown UserId',
  { tag: ['@DELETE-BOOKS-006', '@negative'] },
  async ({ bookStoreApiClient, seedUserForBooks }) => {
    const response = await bookStoreApiClient.deleteAllBooks({
      userId: unknownUserId,
      token: seedUserForBooks.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('User Id not correct!');
  }
);

test(
  'Delete all books without an Authorization header',
  { tag: ['@DELETE-BOOKS-007', '@negative'] },
  async ({ bookStoreApiClient, seedUserWithBook, accountApiClient }) => {
    const response = await bookStoreApiClient.deleteAllBooks({
      userId: seedUserWithBook.userId,
      token: '',
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe('User not authorized!');

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toContain(knownIsbns.first);
  }
);

test(
  'Delete all books with a malformed bearer token',
  { tag: ['@DELETE-BOOKS-008', '@negative'] },
  async ({ bookStoreApiClient, seedUserWithBook, accountApiClient }) => {
    const response = await bookStoreApiClient.deleteAllBooks({
      userId: seedUserWithBook.userId,
      token: 'not-a-real-token',
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe('User not authorized!');

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toContain(knownIsbns.first);
  }
);

// DELETE-BOOKS-009 ("Delete another user's books using own token") is NOT
// generated here: its Preconditions require two independently seeded user
// accounts (user A and user B), and generate-api-tests does not support
// multi-actor test cases without a prior design decision on how such a
// fixture should look (e.g. a seedUserPair-style fixture). The same
// limitation already flagged on POST-BOOKS-013. Flagged in the generation
// summary rather than attempted as a best-effort inline seed.
