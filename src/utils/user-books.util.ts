import { AccountApiClient } from '../api/account-api.client';
import { parseJsonBody } from './api-response.util';
import { GetUserResponseSchema } from '../types/account.schema';

// Reads a user's collection back from the Account resource and projects it to
// bare ISBNs. Lives in utils/ rather than fixtures/: it seeds nothing and owns
// no teardown — it is a query a test runs mid-assertion, which is a different
// job from the one fixtures/ has (see docs/coding-standards.md layer table).
//
// Used wherever a test must prove a BookStore write actually persisted rather
// than trust the response echo, which docs/api-spec/book-store-endpoints.md
// documents as unreliable for a partial batch (see COND-POST-BOOKS-009).
export async function getUserBookIsbns(
  accountApiClient: AccountApiClient,
  { userId, token }: { userId: string; token: string }
): Promise<string[]> {
  const response = await accountApiClient.getUser({ userId, token });
  const userState = await parseJsonBody(response, GetUserResponseSchema);
  return userState.books.map((book) => book.isbn);
}
