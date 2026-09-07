import { test as base } from '@playwright/test';
import { AccountApiClient } from '../api/account-api.client';
import { buildNewUserPayload } from '../data/user.factory';
import { parseJsonBody } from '../utils/api-response.util';
import { deleteSeededUser, seedAuthorizedUser } from './seed-user.util';
import { CreateUserResponseSchema } from '../types/account.schema';
import type { SeededAuthorizedUser, SeededUser } from './seed-user.util';
import type { LoginPayload } from '../types/account.schema';

// For tests whose own DELETE call under test is expected to actually delete
// the user (the success case, or a repeat-delete case proving
// non-idempotency). The test must set `deleted = true` after its own
// successful delete so teardown does not attempt a second one — the
// already-deleted-user response is confirmed 200/1207, not 204
// (docs/api-spec/account-endpoints.md), so an unconditional teardown delete
// would misread that as a failed cleanup and log a false orphan.
interface SelfDeletingAuthorizedUser extends SeededAuthorizedUser {
  deleted: boolean;
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
  seedAuthorizedUserForSelfDelete: SelfDeletingAuthorizedUser;
  userUnderTest: UserUnderTest;
}

export const test = base.extend<AccountFixtures>({
  accountApiClient: async ({ request }, use) => {
    await use(new AccountApiClient(request));
  },

  // Registers a user and nothing else — deliberately no GenerateToken call
  // before use(), which is why this fixture does not reuse seedAuthorizedUser.
  // POST /Account/v1/Authorized reports token state rather than credential
  // validity, so AUTH-030 depends on this fixture handing over a user that has
  // never been tokenized in order to observe `false`. Teardown's token fetch
  // runs after use() and so does not disturb that; do not move it or add a
  // setup-phase token here without splitting off a separate fixture.
  seedUser: async ({ accountApiClient }, use) => {
    const payload = buildNewUserPayload();
    const createResponse = await accountApiClient.createUser(payload);
    const created = await parseJsonBody(createResponse, CreateUserResponseSchema);

    await use({ userName: payload.userName, password: payload.password, userId: created.userID });

    await deleteSeededUser(accountApiClient, payload, created.userID);
  },

  seedAuthorizedUser: async ({ accountApiClient }, use) => {
    const { payload, userId, token } = await seedAuthorizedUser(accountApiClient);

    await use({ userName: payload.userName, password: payload.password, userId, token });

    await deleteSeededUser(accountApiClient, payload, userId, token);
  },

  seedAuthorizedUserForSelfDelete: async ({ accountApiClient }, use) => {
    const { payload, userId, token } = await seedAuthorizedUser(accountApiClient);

    const state: SelfDeletingAuthorizedUser = {
      userName: payload.userName,
      password: payload.password,
      userId,
      token,
      deleted: false,
    };

    await use(state);

    // The test sets state.deleted = true after its own successful delete.
    // Skip teardown's delete in that case — the user is already gone, and a
    // second delete attempt would return 200/1207 rather than 204, which
    // deleteSeededUser would misread as a failed cleanup.
    if (!state.deleted) {
      await deleteSeededUser(accountApiClient, payload, userId, token);
    }
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
      await deleteSeededUser(accountApiClient, userUnderTest.payload, userUnderTest.createdUserId);
    }
  },
});

export { expect } from '@playwright/test';
