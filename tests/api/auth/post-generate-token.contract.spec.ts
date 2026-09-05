import { test, expect } from '../../../src/fixtures/account.fixtures';
import { buildUniqueUsername } from '../../../src/data/user.factory';
import { GenerateTokenResponseSchema } from '../../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'POST /Account/v1/GenerateToken success/failure response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient, seedUser }) => {
    // Both the 200/Success and 200/Failed bodies share this schema's shape
    // (nullable token/expires), so one representative call covers it.
    const response = await accountApiClient.generateToken({
      userName: seedUser.userName,
      password: seedUser.password,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchSchema(GenerateTokenResponseSchema);
  }
);

test(
  'POST /Account/v1/GenerateToken error response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.generateToken({
      userName: buildUniqueUsername(),
      password: '',
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
