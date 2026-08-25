import { z } from 'zod';

// Sourced from the Swagger spec's BookModal definition, not live-verified —
// account responses in this slice always return an empty books[] array.
// Confirm against a real response before trusting this in the book-CRUD slice.
export const BookSchema = z.object({
  isbn: z.string(),
  title: z.string(),
  subTitle: z.string(),
  author: z.string(),
  publish_date: z.iso.datetime(),
  publisher: z.string(),
  pages: z.number(),
  description: z.string(),
  website: z.string(),
});

export type Book = z.infer<typeof BookSchema>;
