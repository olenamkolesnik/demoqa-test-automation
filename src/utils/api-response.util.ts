import type { APIResponse } from '@playwright/test';
import type { ZodType } from 'zod';
import { logger } from './logger';
import { redact, redactResponseText } from './redact.util';

// Truncation bound for a non-JSON body quoted into an error message — enough
// to identify an HTML error page or a stack trace, without pasting a whole
// page into the test report.
const BODY_SNIPPET_LENGTH = 500;

export async function parseJsonBody<T>(response: APIResponse, schema: ZodType<T>): Promise<T> {
  let raw: unknown;

  // response.json() throws a bare SyntaxError ("Unexpected token '<'") before
  // the schema ever runs when the body isn't JSON at all — which several
  // DemoQA endpoints do, returning an HTML stack-trace page on a 500 (see
  // docs/api-spec/book-store-endpoints.md). Rethrown with the status, URL and
  // a redacted body snippet so the failure is diagnosable without a debugger.
  try {
    raw = await response.json();
  } catch (error) {
    const bodyText = await response.text().catch(() => '<unreadable body>');
    const snippet = redactResponseText(bodyText).slice(0, BODY_SNIPPET_LENGTH);
    logger.error(
      `Response body is not valid JSON (status ${response.status()} from ${response.url()}): ${String(error)}\nRaw body: ${snippet}`
    );

    const parseFailure = new Error(
      `Expected a JSON response body but got status ${response.status()} from ${response.url()}. Raw body: ${snippet}`
    );
    // Assigned rather than passed through the Error constructor's options bag:
    // that overload requires lib ES2022 and this project targets ES2020.
    parseFailure.cause = error;
    throw parseFailure;
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    logger.error(
      `Response body failed schema validation (status ${response.status()} from ${response.url()}): ${result.error.message}\nRaw body: ${JSON.stringify(redact(raw))}`
    );
    throw result.error;
  }

  return result.data;
}
