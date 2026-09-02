import { test as base } from '@playwright/test';
import { AccountApiClient } from '../api/account-api.client';
import { buildNewUserPayload } from '../data/user.factory';
import { parseJsonBody } from '../utils/api-response.util';
import { logger } from '../utils/logger';
import { deleteAndLogOrphanOnFailure } from './teardown.util';
import { CreateUserResponseSchema, GenerateTokenResponseSchema } from '../types/account.schema';
import type { LoginPayload } from '../types/account.schema';

interface SeededUser {
  userName: string;
  password: string;
  userId: string;
}

interface SeededAuthorizedUser extends SeededUser {
  token: string;
}

// For tests where the registration call is itself under test, so seedUser
// cannot make it. The test registers using `payload`, then assigns the id it
// gets back to `createdUserId`; teardown deletes it afterwards.
//
// The assignment is what lets cleanup live in the fixture's post-use phase,
// which Playwright runs whatever the test does — including on a failed
// assertion or a thrown parse error. Deleting in the test body instead would
// silently skip cleanup on exactly those paths and orphan a real account on
// the shared backend.
interface UserUnderTest {
  payload: LoginPayload;
  createdUserId: string | undefined;
}

interface AccountFixtures {
  accountApiClient: AccountApiClient;
  seedUser: SeededUser;
  seedAuthorizedUser: SeededAuthorizedUser;
  userUnderTest: UserUnderTest;
}

async function deleteUserAndLogOrphanOnFailure(
  client: AccountApiClient,
  payload: LoginPayload,
  userId: string,
  existingToken?: string
): Promise<void> {
  let token: string | null | undefined = existingToken;

  if (!token) {
    try {
      const tokenResponse = await parseJsonBody(
        await client.generateToken(payload),
        GenerateTokenResponseSchema
      );
      token = tokenResponse.token;
    } catch (error) {
      logger.error(
        `Teardown token re-fetch threw for orphaned user userId=${userId} userName=${payload.userName}: ${String(error)}`
      );
      return;
    }
  }

  if (!token) {
    logger.error(
      `Teardown could not acquire a token to delete orphaned user userId=${userId} userName=${payload.userName}`
    );
    return;
  }

  await deleteAndLogOrphanOnFailure(
    () => client.deleteUser({ userId, token }),
    () => `orphaned userId=${userId} userName=${payload.userName}`,
    204
  );
}

export const test = base.extend<AccountFixtures>({
  accountApiClient: async ({ request }, use) => {
    await use(new AccountApiClient(request));
  },

  seedUser: async ({ accountApiClient }, use) => {
    const payload = buildNewUserPayload();
    const createResponse = await accountApiClient.createUser(payload);
    const created = await parseJsonBody(createResponse, CreateUserResponseSchema);

    await use({ userName: payload.userName, password: payload.password, userId: created.userID });

    await deleteUserAndLogOrphanOnFailure(accountApiClient, payload, created.userID);
  },

  seedAuthorizedUser: async ({ accountApiClient }, use) => {
    const payload = buildNewUserPayload();
    const createResponse = await accountApiClient.createUser(payload);
    const created = await parseJsonBody(createResponse, CreateUserResponseSchema);
    const tokenResponse = await accountApiClient.generateToken(payload);
    const { token } = await parseJsonBody(tokenResponse, GenerateTokenResponseSchema);

    if (!token) {
      logger.error(
        `seedAuthorizedUser could not acquire a token for userId=${created.userID} userName=${payload.userName}`
      );
      throw new Error('seedAuthorizedUser: token acquisition failed');
    }

    await use({
      userName: payload.userName,
      password: payload.password,
      userId: created.userID,
      token,
    });

    await deleteUserAndLogOrphanOnFailure(accountApiClient, payload, created.userID, token);
  },

  userUnderTest: async ({ accountApiClient }, use) => {
    const userUnderTest: UserUnderTest = {
      payload: buildNewUserPayload(),
      createdUserId: undefined,
    };

    await use(userUnderTest);

    // Runs even if the test threw — that is the point of cleaning up here
    // rather than in the test body. Undefined means the registration under
    // test was expected to fail, so there is nothing to delete.
    if (userUnderTest.createdUserId !== undefined) {
      await deleteUserAndLogOrphanOnFailure(
        accountApiClient,
        userUnderTest.payload,
        userUnderTest.createdUserId
      );
    }
  },
});

export { expect } from '@playwright/test';
