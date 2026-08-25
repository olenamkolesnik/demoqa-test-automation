import type { APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from '../utils/logger';

export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  protected async logged(promise: Promise<APIResponse>, label: string): Promise<APIResponse> {
    const response = await promise;
    logger.info(`${label} -> ${response.status()}`);
    return response;
  }
}
