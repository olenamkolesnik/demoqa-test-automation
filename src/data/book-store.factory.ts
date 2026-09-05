import type { AddBooksPayload } from '../types/book-store.schema';

// Known-good catalogue ISBNs, stable across the shared public backend's book
// list (docs/api-spec/book-store-endpoints.md documents the collection as
// never empty). Used as the "valid, unowned" class in POST /BookStore/v1/Books
// test data — picking distinct entries lets multi-ISBN cases avoid collisions
// with each other and with a single-ISBN case run in parallel.
export const knownIsbns = {
  first: '9781449325862',
  second: '9781449331818',
  third: '9781449337711',
} as const;

// Not a real catalogue entry — confirmed live (docs/api-spec/book-store-endpoints.md)
// to be rejected with 400/1205 "ISBN supplied is not available in Books Collection!".
export const unknownIsbn = '0000000000000';

// Syntactically valid UUID that belongs to no registered user — confirmed live
// to be rejected with 401/1207 "User Id not correct!", identically to an
// empty-string userId.
export const unknownUserId = '11111111-2222-3333-4444-555555555555';

// userId has no default — unlike buildNewUserPayload, there is no valid
// value this factory could invent on its own (it must be an id the caller
// already registered), so requiring it keeps a bare call from silently
// producing a guaranteed-401 request.
export function buildAddBooksPayload(
  userId: string,
  overrides?: Partial<AddBooksPayload>
): AddBooksPayload {
  return {
    userId,
    collectionOfIsbns: [{ isbn: knownIsbns.first }],
    ...overrides,
  };
}
