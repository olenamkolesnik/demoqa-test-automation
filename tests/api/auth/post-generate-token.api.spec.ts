import { test, expect } from '../../../src/fixtures/account.fixtures';
import { buildUniqueUsername, buildValidPassword } from '../../../src/data/user.factory';
import { parseJsonBody } from '../../../src/utils/api-response.util';
import { GenerateTokenResponseSchema } from '../../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../../src/types/api-error.schema';

const REQUIRED_FIELD_MESSAGE = 'UserName and Password required.';

test(
  'Generate token with valid credentials',
  { tag: ['@AUTH-022', '@positive'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.generateToken({
      userName: seedUser.userName,
      password: seedUser.password,
    });
    const body = await parseJsonBody(response, GenerateTokenResponseSchema);

    expect.soft(response.status()).toBe(200);
    expect.soft(body.token).toBeTruthy();
    expect.soft(body.expires).toBeTruthy();
    expect.soft(body.status).toBe('Success');
    expect.soft(body.result).toBe('User authorized successfully.');
  }
);

test(
  'Generate token with incorrect password',
  { tag: ['@AUTH-023', '@negative'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.generateToken({
      userName: seedUser.userName,
      password: 'Wrong@9999',
    });
    const body = await parseJsonBody(response, GenerateTokenResponseSchema);

    // 200, not 4xx: this endpoint never rejects bad credentials with an error
    // status — differentiate by `status` in the body only.
    expect.soft(response.status()).toBe(200);
    expect.soft(body.token).toBeNull();
    expect.soft(body.expires).toBeNull();
    expect.soft(body.status).toBe('Failed');
    expect.soft(body.result).toBe('User authorization failed.');
  }
);

test(
  'Generate token with a username that was never registered',
  { tag: ['@AUTH-024', '@negative'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.generateToken({
      userName: buildUniqueUsername(),
      password: buildValidPassword(),
    });
    const body = await parseJsonBody(response, GenerateTokenResponseSchema);

    // Byte-identical to AUTH-023 — the API never reveals whether the account
    // exists, which is the property this test protects.
    expect.soft(response.status()).toBe(200);
    expect.soft(body.token).toBeNull();
    expect.soft(body.expires).toBeNull();
    expect.soft(body.status).toBe('Failed');
    expect.soft(body.result).toBe('User authorization failed.');
  }
);

test(
  'Generate token with an empty password',
  { tag: ['@AUTH-025', '@boundary'] },
  async ({ accountApiClient, seedUser }) => {
    const response = await accountApiClient.generateToken({
      userName: seedUser.userName,
      password: '',
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    // 400/1200, not 200/"Failed": the required-field check short-circuits
    // before any credential comparison. Contrast AUTH-023.
    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Generate token with an empty username',
  { tag: ['@AUTH-026', '@boundary'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.generateToken({
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
  'Generate token with the username key absent from the body',
  { tag: ['@AUTH-027', '@negative'] },
  async ({ request }) => {
    // Raw request, not accountApiClient.generateToken: LoginPayload requires
    // both fields, and this case needs the userName key entirely absent.
    const response = await request.post('/Account/v1/GenerateToken', {
      data: { password: buildValidPassword() },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Generate token with the password key absent from the body',
  { tag: ['@AUTH-028', '@negative'] },
  async ({ request, seedUser }) => {
    // Raw request, not accountApiClient.generateToken: LoginPayload requires
    // both fields, and this case needs the password key entirely absent.
    const response = await request.post('/Account/v1/GenerateToken', {
      data: { userName: seedUser.userName },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);
