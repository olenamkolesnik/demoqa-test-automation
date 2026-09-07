import { test, expect } from '../../../src/fixtures/book-store.fixtures';
import { getUserBookIsbns } from '../../../src/utils/user-books.util';
import {
  buildAddBooksPayload,
  knownIsbns,
  unknownIsbn,
  unknownUserId,
} from '../../../src/data/book-store.factory';
import { parseJsonBody } from '../../../src/utils/api-response.util';
import { ReplaceBookResponseSchema } from '../../../src/types/book-store.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'Replace a book the user does not own',
  { tag: ['@PUT-BOOKS-001', '@negative'] },
  async ({ bookStoreApiClient, accountApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.third,
      payload: { userId: seedUserWithBook.userId, isbn: knownIsbns.second },
      token: seedUserWithBook.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1206');
    expect.soft(error.message).toBe("ISBN supplied is not available in User's Collection!");

    // Confirms the 400 is a genuine rejection, not one returned after the
    // write already happened.
    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toEqual([knownIsbns.first]);
  }
);

test(
  'Replace a book using a path ISBN unknown to the catalogue',
  { tag: ['@PUT-BOOKS-002', '@negative'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: unknownIsbn,
      payload: { userId: seedUserWithBook.userId, isbn: knownIsbns.second },
      token: seedUserWithBook.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1206');
    expect.soft(error.message).toBe("ISBN supplied is not available in User's Collection!");
  }
);

test(
  'Replace a book with an ISBN unknown to the catalogue',
  { tag: ['@PUT-BOOKS-003', '@negative'] },
  async ({ bookStoreApiClient, accountApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: seedUserWithBook.userId, isbn: unknownIsbn },
      token: seedUserWithBook.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1205');
    expect.soft(error.message).toBe('ISBN supplied is not available in Books Collection!');

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toEqual([knownIsbns.first]);
  }
);

test(
  'Replace a book with an empty userId',
  { tag: ['@PUT-BOOKS-004', '@boundary'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: '', isbn: knownIsbns.second },
      token: seedUserWithBook.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('Request Body is Invalid!');
  }
);

test(
  'Replace a book with a well-formed but unknown userId',
  { tag: ['@PUT-BOOKS-005', '@negative'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: unknownUserId, isbn: knownIsbns.second },
      token: seedUserWithBook.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('User Id not correct!');
  }
);

test(
  'Replace a book with the userId key absent from the body',
  { tag: ['@PUT-BOOKS-006', '@negative'] },
  async ({ request, seedUserWithBook }) => {
    // Raw request, not bookStoreApiClient.replaceBook: ReplaceBookPayload
    // requires both fields, and this case needs the userId key entirely
    // absent from the body.
    const response = await request.put(`/BookStore/v1/Books/${knownIsbns.first}`, {
      data: { isbn: knownIsbns.second },
      headers: { Authorization: `Bearer ${seedUserWithBook.token}` },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('Request Body is Invalid!');
  }
);

test(
  'Replace a book with the isbn key absent from the body',
  { tag: ['@PUT-BOOKS-007', '@negative'] },
  async ({ request, seedUserWithBook }) => {
    // Raw request, not bookStoreApiClient.replaceBook: ReplaceBookPayload
    // requires both fields, and this case needs the isbn key entirely
    // absent from the body.
    const response = await request.put(`/BookStore/v1/Books/${knownIsbns.first}`, {
      data: { userId: seedUserWithBook.userId },
      headers: { Authorization: `Bearer ${seedUserWithBook.token}` },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('Request Body is Invalid!');
  }
);

test(
  'Replace a book with an empty request body',
  { tag: ['@PUT-BOOKS-014', '@boundary'] },
  async ({ request, seedUserWithBook }) => {
    // Raw request, not bookStoreApiClient.replaceBook: ReplaceBookPayload
    // requires both fields, and this case needs a body with neither key
    // present at all.
    const response = await request.put(`/BookStore/v1/Books/${knownIsbns.first}`, {
      data: {},
      headers: { Authorization: `Bearer ${seedUserWithBook.token}` },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe('Request Body is Invalid!');
  }
);

test(
  'Replace an owned book with a new book',
  { tag: ['@PUT-BOOKS-008', '@positive'] },
  async ({ bookStoreApiClient, accountApiClient, seedUserWithBook }) => {
    // seedUserWithBook seeds only one ISBN; a second is added here so the
    // "rest of the collection preserved" assertion below can only pass if
    // the replacement is scoped to one entry, not the whole collection —
    // the distinction this test case exists to prove (see
    // COND-PUT-BOOKS-008's Notes).
    const addResponse = await bookStoreApiClient.addBooks({
      payload: buildAddBooksPayload(seedUserWithBook.userId, {
        collectionOfIsbns: [{ isbn: knownIsbns.third }],
      }),
      token: seedUserWithBook.token,
    });
    expect(addResponse.status()).toBe(201);

    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: seedUserWithBook.userId, isbn: knownIsbns.second },
      token: seedUserWithBook.token,
    });

    expect.soft(response.status()).toBe(200);
    const body = await parseJsonBody(response, ReplaceBookResponseSchema);
    expect.soft(body.userId).toBe(seedUserWithBook.userId);
    expect.soft(body.username).toBe(seedUserWithBook.userName);
    const replacedIsbns = body.books.map((book) => book.isbn);
    expect.soft(replacedIsbns).toHaveLength(2);
    expect.soft(replacedIsbns).toContain(knownIsbns.second);
    expect.soft(replacedIsbns).toContain(knownIsbns.third);
    expect.soft(replacedIsbns).not.toContain(knownIsbns.first);

    // Verifies persistence rather than trusting the 200 echo — PUT-BOOKS-009
    // shows this endpoint's response body can misreport the real collection.
    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toHaveLength(2);
    expect.soft(isbns).toContain(knownIsbns.second);
    expect.soft(isbns).toContain(knownIsbns.third);
  }
);

test(
  'Replace an owned book with another book the user already owns',
  { tag: ['@PUT-BOOKS-009', '@negative'] },
  async ({ bookStoreApiClient, accountApiClient, seedUserWithBook }) => {
    // Seeded the same way as PUT-BOOKS-008: two owned ISBNs, so the
    // replacement target (knownIsbns.third) is already in the collection.
    const addResponse = await bookStoreApiClient.addBooks({
      payload: buildAddBooksPayload(seedUserWithBook.userId, {
        collectionOfIsbns: [{ isbn: knownIsbns.third }],
      }),
      token: seedUserWithBook.token,
    });
    expect(addResponse.status()).toBe(201);

    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: seedUserWithBook.userId, isbn: knownIsbns.third },
      token: seedUserWithBook.token,
    });

    // Pins current (defective) behavior: this succeeds with 200 and
    // silently drops a book, rather than rejecting the duplicate target
    // the way POST /BookStore/v1/Books rejects one with 400/1210. See
    // COND-PUT-BOOKS-009's Notes — do not "fix" this assertion without
    // first confirming the API itself changed.
    expect.soft(response.status()).toBe(200);

    // The response body itself is not a trustworthy record of the collection
    // here (live-verified 2026-09-06): it echoes the surviving ISBN TWICE,
    // a different wrong count from the real state. Assert that misreport
    // explicitly, but read the actual persisted state from the read-back
    // below, not from this body.
    const body = await parseJsonBody(response, ReplaceBookResponseSchema);
    expect.soft(body.books).toHaveLength(2);
    expect.soft(body.books.every((book) => book.isbn === knownIsbns.third)).toBe(true);

    // Confirms the loss is real, not a reporting artifact of the 200 body —
    // and that the real state is a single entry, not the two the body claims.
    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toHaveLength(1);
    expect.soft(isbns).toContain(knownIsbns.third);
  }
);

test(
  'Replace a book with itself',
  { tag: ['@PUT-BOOKS-010', '@boundary'] },
  async ({ bookStoreApiClient, accountApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: seedUserWithBook.userId, isbn: knownIsbns.first },
      token: seedUserWithBook.token,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    // Pins current (defective) behavior: the book IS in the user's
    // collection, but the endpoint reports it as not available there.
    // See COND-PUT-BOOKS-010's Notes.
    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1206');
    expect.soft(error.message).toBe("ISBN supplied is not available in User's Collection!");

    // Given PUT-BOOKS-009's data loss, a rejected no-op that nonetheless
    // removed the book would be the worse failure — rule it out explicitly.
    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toEqual([knownIsbns.first]);
  }
);

test(
  'Replace a book without an Authorization header',
  { tag: ['@PUT-BOOKS-011', '@negative'] },
  async ({ request, accountApiClient, seedUserWithBook }) => {
    const response = await request.put(`/BookStore/v1/Books/${knownIsbns.first}`, {
      data: { userId: seedUserWithBook.userId, isbn: knownIsbns.second },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe('User not authorized!');

    const isbns = await getUserBookIsbns(accountApiClient, {
      userId: seedUserWithBook.userId,
      token: seedUserWithBook.token,
    });
    expect.soft(isbns).toEqual([knownIsbns.first]);
  }
);

test(
  'Replace a book with a malformed token',
  { tag: ['@PUT-BOOKS-012', '@negative'] },
  async ({ bookStoreApiClient, seedUserWithBook }) => {
    const response = await bookStoreApiClient.replaceBook({
      isbn: knownIsbns.first,
      payload: { userId: seedUserWithBook.userId, isbn: knownIsbns.second },
      token: 'not-a-real-token',
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe('User not authorized!');
  }
);

// PUT-BOOKS-013 ("Replace a book in another user's collection") is NOT
// generated here: it requires two independently seeded users, which this
// generator does not support (see generate-api-tests/SKILL.md). It remains
// `Not automated` in docs/test-cases/api/bookstore/put-books.md, the same
// outcome as DELETE-BOOKS-009.
