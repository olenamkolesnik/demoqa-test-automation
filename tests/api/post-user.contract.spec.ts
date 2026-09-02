import { test, expect } from '../../src/fixtures/account.fixtures';
import { buildUniqueUsername, invalidPasswords } from '../../src/data/user.factory';
import { parseJsonBody } from '../../src/utils/api-response.util';
import { CreateUserResponseSchema } from '../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../src/types/api-error.schema';

test(
  'POST /Account/v1/User success response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient, userUnderTest }) => {
    const response = await accountApiClient.createUser(userUnderTest.payload);
    const body: unknown = await response.json();

    // Recorded before the assertions so the fixture still tears the account
    // down if the schema check below fails — which is exactly when this test
    // is doing its job and catching drift.
    const createdUser = await parseJsonBody(response, CreateUserResponseSchema);
    userUnderTest.createdUserId = createdUser.userID;

    expect(response.status()).toBe(201);
    expect(body).toMatchSchema(CreateUserResponseSchema);
  }
);

test(
  'POST /Account/v1/User error response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient }) => {
    // One representative rejection is enough — every error this endpoint
    // returns (1200, 1204, 1300) shares the same { code, message } envelope.
    const response = await accountApiClient.createUser({
      userName: buildUniqueUsername(),
      password: invalidPasswords.noUppercase,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
