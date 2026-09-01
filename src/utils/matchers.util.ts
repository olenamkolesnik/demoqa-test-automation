import { expect } from '@playwright/test';
import type { z } from 'zod';

expect.extend({
  toMatchSchema(received: unknown, schema: z.ZodTypeAny) {
    const result = schema.safeParse(received);
    if (result.success) {
      return { message: () => 'passed', pass: true };
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
      toMatchSchema(schema: z.ZodTypeAny): R;
    }
  }
}
