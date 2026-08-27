import type { APIResponse } from '@playwright/test';
import type { ZodType } from 'zod';
import { logger } from './logger';
import { redact } from './redact.util';

export async function parseJsonBody<T>(response: APIResponse, schema: ZodType<T>): Promise<T> {
  const raw: unknown = await response.json();
  const result = schema.safeParse(raw);

  if (!result.success) {
    logger.error(
      `Response body failed schema validation: ${result.error.message}\nRaw body: ${JSON.stringify(redact(raw))}`
    );
    throw result.error;
  }

  return result.data;
}
