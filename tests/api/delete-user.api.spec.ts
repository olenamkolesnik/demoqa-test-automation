import { test, expect } from '../../src/fixtures/account.fixtures';
import { parseJsonBody } from '../../src/utils/api-response.util';
import { ApiErrorResponseSchema } from '../../src/types/api-error.schema';

test(
  'Delete own user account with a valid token',
  { tag: ['@AUTH-017', '@positive'] },
  async ({ accountApiClient, seedAuthorizedUserForSelfDelete }) => {
    const response = await accountApiClient.deleteUser({
      userId: seedAuthorizedUserForSelfDelete.userId,
      token: seedAuthorizedUserForSelfDelete.token,
    });
    const body = await response.text();

    expect.soft(response.status()).toBe(204);
    expect.soft(body).toBe('');

    // Marks the delete done so the fixture's teardown doesn't attempt a
    // second one — see the SelfDeletingAuthorizedUser doc in account.fixtures.ts.
    seedAuthorizedUserForSelfDelete.deleted = true;
  }
);

test(
  'Delete user account with no Authorization header',
  { tag: ['@AUTH-018', '@negative'] },
  async ({ request, seedUser }) => {
    // AccountApiClient.deleteUser always sets an Authorization header via
    // authHeader(token); this case needs the header absent entirely, so it
    // bypasses the client and calls the raw request fixture directly.
    const response = await request.delete(`/Account/v1/User/${seedUser.userId}`);
    const body = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(body.code).toBe('1200');
    expect.soft(body.message).toBe('User not authorized!');
  }
);

test(
  'Delete user account with an invalid or malformed token',
  { tag: ['@AUTH-019', '@negative'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.deleteUser({
      userId: seedUser.userId,
      token: 'not-a-real-token-abc123',
    });
    const body = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(401);
    expect.soft(body.code).toBe('1200');
    expect.soft(body.message).toBe('User not authorized!');
  }
);

test(
  'Delete a non-existent user UUID with a valid unrelated token',
  { tag: ['@AUTH-020', '@negative'] },
  async ({ accountApiClient, seedAuthorizedUser }) => {
    const response = await accountApiClient.deleteUser({
      userId: '00000000-0000-0000-0000-000000000000',
      token: seedAuthorizedUser.token,
    });
    const body = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(200);
    expect.soft(body.code).toBe('1207');
    expect.soft(body.message).toBe('User Id not correct!');
  }
);

test(
  'Delete an already-deleted user account',
  { tag: ['@AUTH-021', '@negative'] },
  async ({ accountApiClient, seedAuthorizedUserForSelfDelete }) => {
    const firstDelete = await accountApiClient.deleteUser({
      userId: seedAuthorizedUserForSelfDelete.userId,
      token: seedAuthorizedUserForSelfDelete.token,
    });
    expect.soft(firstDelete.status()).toBe(204);
    seedAuthorizedUserForSelfDelete.deleted = true;

    // Same stale token reused deliberately — this is what rules out a 1200
    // authorization error and confirms the failure is reported against the
    // UUID instead. Regenerating a token here would test something else.
    const secondDelete = await accountApiClient.deleteUser({
      userId: seedAuthorizedUserForSelfDelete.userId,
      token: seedAuthorizedUserForSelfDelete.token,
    });
    const body = await parseJsonBody(secondDelete, ApiErrorResponseSchema);

    expect.soft(secondDelete.status()).toBe(200);
    expect.soft(body.code).toBe('1207');
    expect.soft(body.message).toBe('User Id not correct!');
  }
);
