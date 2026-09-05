import { test, expect } from '../../../src/fixtures/account.fixtures';
import { buildUniqueUsername, buildValidPassword } from '../../../src/data/user.factory';
import { parseJsonBody } from '../../../src/utils/api-response.util';
import { AuthorizedResponseSchema } from '../../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

const REQUIRED_FIELD_MESSAGE = 'UserName and Password required.';
const USER_NOT_FOUND_MESSAGE = 'User not found!';

test(
  'Check authorization for a user who has generated a token',
  { tag: ['@AUTH-029', '@positive'] },
  async ({ accountApiClient, seedAuthorizedUser }) => {
    const response = await accountApiClient.checkAuthorized({
      userName: seedAuthorizedUser.userName,
      password: seedAuthorizedUser.password,
    });
    const body = await parseJsonBody(response, AuthorizedResponseSchema);

    // Identity against true, never truthiness — AUTH-030 shares this same 200
    // status with a false body, so a truthy check would accept both.
    expect.soft(response.status()).toBe(200);
    expect.soft(body).toBe(true);
  }
);

test(
  'Check authorization for a user who has never generated a token',
  { tag: ['@AUTH-030', '@positive'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.checkAuthorized({
      userName: seedUser.userName,
      password: seedUser.password,
    });
    const body = await parseJsonBody(response, AuthorizedResponseSchema);

    // seedUser never calls GenerateToken — calling it here before the
    // assertion would flip the state under test from false to true.
    expect.soft(response.status()).toBe(200);
    expect.soft(body).toBe(false);
  }
);

test(
  'Check authorization with an incorrect password',
  { tag: ['@AUTH-031', '@negative'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.checkAuthorized({
      userName: seedUser.userName,
      password: 'Wrong@9999',
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    // 404/1207, not 200/false: a wrong password is a distinct outcome from a
    // tokenless-but-correct login. Message is factually misleading but real.
    expect.soft(response.status()).toBe(404);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe(USER_NOT_FOUND_MESSAGE);
  }
);

test(
  'Check authorization with a username that was never registered',
  { tag: ['@AUTH-032', '@negative'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.checkAuthorized({
      userName: buildUniqueUsername(),
      password: buildValidPassword(),
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    // Byte-identical to AUTH-031 — the API never reveals whether the account
    // exists, which is the property this test protects.
    expect.soft(response.status()).toBe(404);
    expect.soft(error.code).toBe('1207');
    expect.soft(error.message).toBe(USER_NOT_FOUND_MESSAGE);
  }
);

test(
  'Check authorization with an empty password',
  { tag: ['@AUTH-033', '@boundary'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.checkAuthorized({
      userName: seedUser.userName,
      password: '',
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    // 400/1200, not 404/1207: the required-field check short-circuits before
    // any credential lookup, even though the username is a real registered one.
    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Check authorization with an empty username',
  { tag: ['@AUTH-034', '@boundary'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.checkAuthorized({
      userName: '',
      password: buildValidPassword(),
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Check authorization with the username key absent from the body',
  { tag: ['@AUTH-035', '@negative'] },
  async ({ request }) => {
    // Raw request, not accountApiClient.checkAuthorized: LoginPayload requires
    // both fields, and this case needs the userName key entirely absent.
    const response = await request.post('/Account/v1/Authorized', {
      data: { password: buildValidPassword() },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Check authorization with the password key absent from the body',
  { tag: ['@AUTH-036', '@negative'] },
  async ({ request, seedUser }) => {
    // Raw request, not accountApiClient.checkAuthorized: LoginPayload requires
    // both fields, and this case needs the password key entirely absent.
    const response = await request.post('/Account/v1/Authorized', {
      data: { userName: seedUser.userName },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Check authorization with a wholly empty request body',
  { tag: ['@AUTH-036', '@negative'] },
  async ({ request }) => {
    // See AUTH-036's Notes in the test-cases doc: both keys absent takes the
    // same required-field path as either key absent alone (live-verified).
    const response = await request.post('/Account/v1/Authorized', {
      data: {},
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);
