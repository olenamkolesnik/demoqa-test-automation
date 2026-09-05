import { z } from 'zod';

// GET /BookStore/v1/Books item shape — confirmed live via
// docs/api-spec/book-store-endpoints.md. publish_date is left as a plain
// string (not z.iso.datetime()) since its real format has not been
// specifically re-verified for this endpoint — matching the same
// not-yet-confirmed treatment already used for AccountBookSchema.
export const BookSchema = z
  .object({
    isbn: z.string(),
    title: z.string(),
    subTitle: z.string(),
    author: z.string(),
    publish_date: z.string(),
    publisher: z.string(),
    pages: z.number(),
    description: z.string(),
    website: z.string(),
  })
  .strict();

export type Book = z.infer<typeof BookSchema>;

// GET /BookStore/v1/Books response — confirmed live: { books: BookModal[] }.
export const AllBooksResponseSchema = z
  .object({
    books: z.array(BookSchema),
  })
  .strict();

export type AllBooksResponse = z.infer<typeof AllBooksResponseSchema>;

// POST /BookStore/v1/Books request body — confirmed live via
// docs/api-spec/book-store-endpoints.md.
export const AddBooksPayloadSchema = z.object({
  userId: z.string(),
  collectionOfIsbns: z.array(z.object({ isbn: z.string() })),
});

export type AddBooksPayload = z.infer<typeof AddBooksPayloadSchema>;

// POST /BookStore/v1/Books success response — confirmed live as an object
// { books: [{ isbn }] }, not the bare array Swagger declares. Note the
// response echoes submitted ISBNs and is not proof of persistence — a batch
// mixing a valid and an unknown ISBN echoes both but only the valid one is
// actually stored (docs/api-spec/book-store-endpoints.md, live check
// 2026-09-05).
export const AddBooksResponseSchema = z
  .object({
    books: z.array(z.object({ isbn: z.string() })),
  })
  .strict();

export type AddBooksResponse = z.infer<typeof AddBooksResponseSchema>;
