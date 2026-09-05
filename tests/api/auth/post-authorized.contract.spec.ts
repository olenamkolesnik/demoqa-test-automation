import { test, expect } from '../../../src/fixtures/account.fixtures';
import { buildUniqueUsername, buildValidPassword } from '../../../src/data/user.factory';
import { AuthorizedResponseSchema } from '../../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

test(
  'POST /Account/v1/Authorized success response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient, seedUser }) => {
    // The 200 body is a bare JSON boolean, not an object — both the true and
    // false outcomes share this same scalar schema, so one representative
    // call covers it.
    const response = await accountApiClient.checkAuthorized({
      userName: seedUser.userName,
      password: seedUser.password,
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchSchema(AuthorizedResponseSchema);
  }
);

test(
  'POST /Account/v1/Authorized error response matches schema',
  { tag: ['@contract', '@AUTH'] },
  async ({ accountApiClient }) => {
    // Both the 404/1207 (wrong credentials) and 400/1200 (required-field)
    // paths share this same MessageModal shape, so one representative call
    // covers it.
    const response = await accountApiClient.checkAuthorized({
      userName: buildUniqueUsername(),
      password: buildValidPassword(),
    });
    const body: unknown = await response.json();

    expect(response.status()).toBe(404);
    expect(body).toMatchSchema(ApiErrorResponseSchema);
  }
);
