import { test, expect } from '../../src/fixtures/account.fixtures';
import { ApiErrorResponseSchema } from '../../src/types/api-error.schema';

test(
  'DELETE /Account/v1/User/{UUID} success response has no body',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient, seedAuthorizedUserForSelfDelete }) => {
    const response = await accountApiClient.deleteUser({
      userId: seedAuthorizedUserForSelfDelete.userId,
      token: seedAuthorizedUserForSelfDelete.token,
    });
    const body = await response.text();

    expect(response.status()).toBe(204);
    expect(body).toBe('');

    seedAuthorizedUserForSelfDelete.deleted = true;
  }
);

test(
  'DELETE /Account/v1/User/{UUID} error response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.deleteUser({
      userId: seedUser.userId,
      token: 'not-a-real-token-abc123',
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(401);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
