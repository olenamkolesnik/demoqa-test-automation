import type { APIResponse } from '@playwright/test';
import { logger } from '../utils/logger';

// Shared "delete, check status, log orphan" shape for seed-fixture teardown —
// any resource-specific setup (e.g. acquiring a token before delete) stays in
// the caller; this only standardizes the part that's identical across resources.
// successStatus is a required param, not hardcoded: Account's confirmed
// DELETE success is 204 (docs/api-spec/account-endpoints.md), but a future
// resource (e.g. BookStore) isn't guaranteed to match — hardcoding 204 here
// would silently log a genuinely successful delete as an orphan.
export async function deleteAndLogOrphanOnFailure(
  deleteFn: () => Promise<APIResponse>,
  describeOrphan: () => string,
  successStatus: number
): Promise<void> {
  const response = await deleteFn();
  if (response.status() !== successStatus) {
    logger.error(`Teardown failed to delete (status ${response.status()}) — ${describeOrphan()}`);
  }
}
