import { expect } from '@playwright/test';
import type { ZodType } from 'zod';

expect.extend({
  toMatchSchema(received: unknown, schema: ZodType) {
    const result = schema.safeParse(received);
    if (result.success) {
      return {
        message: () => `Expected body not to match schema, but it validated successfully:
${JSON.stringify(received, null, 2)}`,
        pass: true,
      };
    }
    return {
      message: () => `Schema validation failed:\n${JSON.stringify(result.error.format(), null, 2)}`,
      pass: false,
    };
  },
});

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toMatchSchema(schema: ZodType): R;
    }
  }
}
