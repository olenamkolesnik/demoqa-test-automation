import { test, expect } from '../../src/fixtures/account.fixtures';
import {
  buildUniqueUsername,
  buildValidPassword,
  invalidPasswords,
} from '../../src/data/user.factory';
import { parseJsonBody } from '../../src/utils/api-response.util';
import { CreateUserResponseSchema } from '../../src/types/account.schema';
import { ApiErrorResponseSchema } from '../../src/types/api-error.schema';

// Shared by every complexity-violation case (AUTH-002 to AUTH-005) and by the
// below-minimum-length case (AUTH-007). The API returns one message for all
// five and never names which rule failed.
const WEAK_PASSWORD_MESSAGE =
  "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer.";

const REQUIRED_FIELD_MESSAGE = 'UserName and Password required.';

test(
  'Register user with valid credentials',
  { tag: ['@AUTH-001', '@positive'] },
  async ({ accountApiClient, userUnderTest }) => {
    // Not seedUser: the registration call is the thing under test here, so the
    // test makes it itself. Recording the new id on the fixture hands teardown
    // back to it, so the account is deleted even if an assertion below fails.
    const response = await accountApiClient.createUser(userUnderTest.payload);
    const createdUser = await parseJsonBody(response, CreateUserResponseSchema);
    userUnderTest.createdUserId = createdUser.userID;

    expect.soft(response.status()).toBe(201);
    expect.soft(createdUser.userID).toBeTruthy();
    expect.soft(createdUser.username).toBe(userUnderTest.payload.userName);
    expect.soft(createdUser.books).toEqual([]);

    // CreateUserResponseSchema is .strict(), so parseJsonBody above already
    // rejects a body carrying the lowercase userId key the Swagger spec
    // wrongly documents — that assertion is enforced, not skipped.
  }
);

test(
  'Register user with password missing an uppercase letter',
  { tag: ['@AUTH-002', '@negative'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.createUser({
      userName: buildUniqueUsername(),
      password: invalidPasswords.noUppercase,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1300');
    expect.soft(error.message).toBe(WEAK_PASSWORD_MESSAGE);
  }
);

test(
  'Register user with password missing a lowercase letter',
  { tag: ['@AUTH-003', '@negative'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.createUser({
      userName: buildUniqueUsername(),
      password: invalidPasswords.noLowercase,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1300');
    expect.soft(error.message).toBe(WEAK_PASSWORD_MESSAGE);
  }
);

test(
  'Register user with password missing a digit',
  { tag: ['@AUTH-004', '@negative'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.createUser({
      userName: buildUniqueUsername(),
      password: invalidPasswords.noDigit,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1300');
    expect.soft(error.message).toBe(WEAK_PASSWORD_MESSAGE);
  }
);

test(
  'Register user with password missing a special character',
  { tag: ['@AUTH-005', '@negative'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.createUser({
      userName: buildUniqueUsername(),
      password: invalidPasswords.noSpecialChar,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1300');
    expect.soft(error.message).toBe(WEAK_PASSWORD_MESSAGE);
  }
);

test(
  'Register user with an empty password',
  { tag: ['@AUTH-006', '@boundary'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.createUser({
      userName: buildUniqueUsername(),
      password: invalidPasswords.empty,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    // 1200, not 1300: an empty password is treated as an absent field and
    // never reaches the complexity check, despite violating the 8-char
    // minimum. Live-verified 2026-09-02; contrast AUTH-007 below.
    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Register user with a password one character below the minimum length',
  { tag: ['@AUTH-007', '@boundary'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.createUser({
      userName: buildUniqueUsername(),
      password: invalidPasswords.tooShort,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1300');
    expect.soft(error.message).toBe(WEAK_PASSWORD_MESSAGE);
  }
);

test(
  'Register user with the userName field entirely absent from the request',
  { tag: ['@AUTH-008', '@negative'] },
  async ({ request }) => {
    // Raw request, not accountApiClient.createUser: LoginPayload requires both
    // fields, and this case needs the userName key entirely absent from the body.
    const response = await request.post('/Account/v1/User', {
      data: { password: buildValidPassword() },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Register user with the password field entirely absent from the request',
  { tag: ['@AUTH-009', '@negative'] },
  async ({ request }) => {
    // Raw request, not accountApiClient.createUser: LoginPayload requires both
    // fields, and this case needs the password key entirely absent from the body.
    const response = await request.post('/Account/v1/User', {
      data: { userName: buildUniqueUsername() },
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(400);
    expect.soft(error.code).toBe('1200');
    expect.soft(error.message).toBe(REQUIRED_FIELD_MESSAGE);
  }
);

test(
  'Register user with an empty userName',
  { tag: ['@AUTH-010', '@boundary'] },
  async ({ accountApiClient }) => {
    const response = await accountApiClient.createUser({
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
  'Register a username, then register again with the same username',
  { tag: ['@AUTH-011', '@negative'] },
  async ({ accountApiClient, seedUser }) => {
    // seedUser supplies the already-registered account this case needs, and
    // owns its teardown; only the duplicate attempt below is under test.
    const response = await accountApiClient.createUser({
      userName: seedUser.userName,
      password: seedUser.password,
    });
    const error = await parseJsonBody(response, ApiErrorResponseSchema);

    expect.soft(response.status()).toBe(406);
    expect.soft(error.code).toBe('1204');
    expect.soft(error.message).toBe('User exists!');
  }
);
