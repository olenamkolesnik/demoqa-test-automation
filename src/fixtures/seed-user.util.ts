import { AccountApiClient } from '../api/account-api.client';
import { buildNewUserPayload } from '../data/user.factory';
import { parseJsonBody } from '../utils/api-response.util';
import { logger } from '../utils/logger';
import { deleteAndLogOrphanOnFailure } from './teardown.util';
import { CreateUserResponseSchema, GenerateTokenResponseSchema } from '../types/account.schema';
import type { LoginPayload } from '../types/account.schema';

// Confirmed live 2026-09-07 (three independent users): DELETE /Account/v1/User
// removes the user's book collection along with the user — a follow-up GET
// returns 401/1207 "User not found!", so the collection is unreachable rather
// than orphaned. Book-seeding fixtures therefore tear down the user only; a
// DELETE /BookStore/v1/Books call before it would be redundant.
export interface SeededUser {
  userName: string;
  password: string;
  userId: string;
}

export interface SeededAuthorizedUser extends SeededUser {
  token: string;
}

// Registration + tokenization, shared by every authorized-user fixture across
// resources. The fixtures themselves stay separate (a fixture name must state
// its exact precondition — see docs/coding-standards.md), but the procedure
// behind them is identical and lives here once.
//
// Returns the payload alongside the ids because teardown needs the credentials
// to re-acquire a token if the original one is gone.
export async function seedAuthorizedUser(accountApiClient: AccountApiClient): Promise<{
  payload: LoginPayload;
  userId: string;
  token: string;
}> {
  const payload = buildNewUserPayload();
  const createResponse = await accountApiClient.createUser(payload);
  const created = await parseJsonBody(createResponse, CreateUserResponseSchema);
  const tokenResponse = await accountApiClient.generateToken(payload);
  const { token } = await parseJsonBody(tokenResponse, GenerateTokenResponseSchema);

  // Checked immediately rather than let a null token travel into the fixture's
  // consumers, where it would surface as a confusing 401 instead of a setup
  // failure. The message names the user so a failure is traceable on the
  // shared backend.
  if (!token) {
    const failure = `Failed to acquire a token for seeded userId=${created.userID} userName=${payload.userName}`;
    logger.error(failure);
    throw new Error(failure);
  }

  return { payload, userId: created.userID, token };
}

// Deletes a seeded user, re-acquiring a token first if the caller doesn't have
// one to hand (the self-delete fixture's token may already be stale). A
// teardown failure is logged with the orphaned id, never thrown — a cleanup
// problem must not fail an otherwise-passing test, but it must stay traceable.
export async function deleteSeededUser(
  accountApiClient: AccountApiClient,
  payload: LoginPayload,
  userId: string,
  existingToken?: string
): Promise<void> {
  let token: string | null | undefined = existingToken;

  if (!token) {
    try {
      const tokenResponse = await parseJsonBody(
        await accountApiClient.generateToken(payload),
        GenerateTokenResponseSchema
      );
      token = tokenResponse.token;
    } catch (error) {
      logger.error(
        `Teardown token re-fetch threw for orphaned userId=${userId} userName=${payload.userName}: ${String(error)}`
      );
      return;
    }
  }

  if (!token) {
    logger.error(
      `Teardown could not acquire a token to delete orphaned userId=${userId} userName=${payload.userName}`
    );
    return;
  }

  await deleteAndLogOrphanOnFailure(
    () => accountApiClient.deleteUser({ userId, token }),
    () => `orphaned userId=${userId} userName=${payload.userName}`,
    204
  );
}
