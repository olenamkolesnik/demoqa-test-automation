import { z } from 'zod';
import { AccountBookSchema } from './account-book.schema';

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
  books: z.array(AccountBookSchema),
});

export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

// GET /Account/v1/User/{UUID} response — confirmed live: lowercase "d".
// Deliberately not unified with CreateUserResponseSchema; the two live
// endpoints genuinely disagree on this field's casing.
export const GetUserResponseSchema = z.object({
  userId: z.string(),
  username: z.string(),
  books: z.array(AccountBookSchema),
});

export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;

// result mirrors status as a closed set — both confirmed live in
// docs/api-spec/account-endpoints.md. If a future backend wording tweak
// breaks this, that's a real signal the confirmed doc is stale, not noise.
export const GenerateTokenResponseSchema = z.object({
  token: z.string().nullable(),
  expires: z.iso.datetime().nullable(),
  status: z.enum(['Success', 'Failed']),
  result: z.enum(['User authorized successfully.', 'User authorization failed.']),
});

export type GenerateTokenResponse = z.infer<typeof GenerateTokenResponseSchema>;

// POST /Account/v1/Authorized response — confirmed live: a bare boolean body,
// not an object wrapper. Not a placeholder/typo.
export const AuthorizedResponseSchema = z.boolean();

export type AuthorizedResponse = z.infer<typeof AuthorizedResponseSchema>;
