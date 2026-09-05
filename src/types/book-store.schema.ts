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
