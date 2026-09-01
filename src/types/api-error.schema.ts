import { z } from 'zod';

export const ApiErrorResponseSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
