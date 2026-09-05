import { test, expect } from '../../../src/fixtures/account.fixtures';
import { GetUserResponseSchema } from '../../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'GET /Account/v1/User/{UUID} success response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient, seedAuthorizedUser }) => {
    const response = await accountApiClient.getUser({
      userId: seedAuthorizedUser.userId,
      token: seedAuthorizedUser.token,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchSchema(GetUserResponseSchema);
  }
);

test(
  'GET /Account/v1/User/{UUID} error response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.getUser({
      userId: seedUser.userId,
      token: 'not-a-real-token-abc123',
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(401);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
