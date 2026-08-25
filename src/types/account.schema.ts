import { z } from 'zod';
import { BookSchema } from './book.schema';

// Request payload shared by GenerateToken and Authorized; also what the
// data factory builds. See docs/api-spec/account-endpoints.md.
export const LoginPayloadSchema = z.object({
  userName: z.string(),
  password: z.string(),
});

export type LoginPayload = z.infer<typeof LoginPayloadSchema>;

// POST /Account/v1/User response — confirmed live: capital "ID".
export const CreateUserResponseSchema = z.object({
  userID: z.string(),
  username: z.string(),
  books: z.array(BookSchema),
});

export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

// GET /Account/v1/User/{UUID} response — confirmed live: lowercase "d".
// Deliberately not unified with CreateUserResponseSchema; the two live
// endpoints genuinely disagree on this field's casing.
export const GetUserResponseSchema = z.object({
  userId: z.string(),
  username: z.string(),
  books: z.array(BookSchema),
});

export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;

export const GenerateTokenResponseSchema = z.object({
  token: z.string().nullable(),
  expires: z.iso.datetime().nullable(),
  status: z.enum(['Success', 'Failed']),
  result: z.string(),
});

export type GenerateTokenResponse = z.infer<typeof GenerateTokenResponseSchema>;

export const AuthorizedResponseSchema = z.boolean();

export type AuthorizedResponse = z.infer<typeof AuthorizedResponseSchema>;
