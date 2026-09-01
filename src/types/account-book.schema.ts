import { z } from 'zod';

// The books[] shape as embedded in Account responses (CreateUser/GetUser).
// docs/api-spec/account-endpoints.md confirms both endpoints return an empty
// books[] array live — a populated entry has never actually been observed, so
// field names/types below are sourced from the Swagger spec's (unreliable)
// BookModal definition only. publish_date is left as a plain string (not
// z.iso.datetime()) since there's no live evidence of its real format — a
// strict validator here would fail on a guess, not a genuine contract break.
// Deliberately separate from any future BookStore DTO in book.schema.ts: this
// file only models what Account endpoints embed, which may not match the
// live-verified shape the BookStore API itself actually returns.
export const AccountBookSchema = z
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

export type AccountBook = z.infer<typeof AccountBookSchema>;
