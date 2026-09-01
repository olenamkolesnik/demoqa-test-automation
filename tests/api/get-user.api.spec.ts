import { test, expect } from '../../src/fixtures/account.fixtures';
import { parseJsonBody } from '../../src/utils/api-response.util';
import { GetUserResponseSchema } from '../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../src/types/api-error.schema';

test(
  'Get own user profile with a valid token',
  { tag: ['@AUTH-012', '@positive'] },
  async ({ accountApiClient, seedAuthorizedUser }) => {
    const response = await accountApiClient.getUser({
      userId: seedAuthorizedUser.userId,
      token: seedAuthorizedUser.token,
    });
    const body = await parseJsonBody(response, GetUserResponseSchema);

    expect.soft(response.status()).toBe(200);
    expect.soft(body.userId).toBe(seedAuthorizedUser.userId);
    expect.soft(body.username).toBe(seedAuthorizedUser.userName);
    expect.soft(body.books).toEqual([]);
  }
);

test(
  'Get user profile with no Authorization header',
  { tag: ['@AUTH-013', '@negative'] },
  async ({ request, seedUser }) => {
    // AccountApiClient.getUser always sets an Authorization header via
    // authHeader(token); this case needs the header absent entirely, so it
    // bypasses the client and calls the raw request fixture directly.
    const response = await request.get(`/Account/v1/User/${seedUser.userId}`);
    const body = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(body.code).toBe('1200');
    expect.soft(body.message).toBe('User not authorized!');
  }
);

test(
  'Get user profile with an invalid or malformed token',
  { tag: ['@AUTH-014', '@negative'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.getUser({
      userId: seedUser.userId,
      token: 'not-a-real-token-abc123',
    });
    const body = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(body.code).toBe('1200');
    expect.soft(body.message).toBe('User not authorized!');
  }
);
