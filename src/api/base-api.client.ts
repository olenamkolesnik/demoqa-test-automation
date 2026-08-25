import type { APIRequestContext, APIResponse } from '@playwright/test';
import { logger, debugEnabled } from '../utils/logger';
import { redact, redactResponseText } from '../utils/redact.util';

export abstract class BaseApiClient {
  protected constructor(protected readonly request: APIRequestContext) {}

  protected authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  protected async logged(
    promise: Promise<APIResponse>,
    label: string,
    requestPayload?: unknown
  ): Promise<APIResponse> {
    if (debugEnabled() && requestPayload !== undefined) {
      logger.debug(`${label} request payload: ${JSON.stringify(redact(requestPayload))}`);
    }

    const response = await promise;
    logger.info(`${label} -> ${response.status()}`);

    if (debugEnabled()) {
      const body = await response.text().catch(() => '<unreadable body>');
      logger.debug(`${label} response body: ${redactResponseText(body)}`);
    }

    return response;
  }
}
