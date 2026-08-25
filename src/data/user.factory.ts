import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import type { LoginPayload } from '../types/account.schema';

// Prefixed and suffixed for two different reasons: "qa_" makes any orphaned
// user left on the shared public backend after a crashed run identifiable
// for manual cleanup; the UUID suffix guarantees uniqueness across parallel
// workers (playwright.config.ts runs fullyParallel).
export function buildUniqueUsername(): string {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
  return `qa_${faker.internet.username()}_${suffix}`;
}

// Hand-rolled, not faker's internet.password() — this guarantees all four
// required character classes by construction, matching the confirmed real
// rule in docs/api-spec/account-endpoints.md (>=8 chars, upper, lower,
// digit, special char). Faker's generator doesn't reliably satisfy that.
export function buildValidPassword(): string {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
  return `Aa1!${suffix}`;
}

export function buildNewUserPayload(overrides?: Partial<LoginPayload>): LoginPayload {
  return {
    userName: buildUniqueUsername(),
    password: buildValidPassword(),
    ...overrides,
  };
}

// Named negative-partition passwords for EP/BVA test rows, matching the
// confirmed rule in docs/api-spec/account-endpoints.md.
export const invalidPasswords = {
  tooShort: 'Aa1!aaa', // 7 chars
  noUppercase: 'aa1!aaaaaaa',
  noLowercase: 'AA1!AAAAAAA',
  noDigit: 'Aaaa!aaaaaaa',
  noSpecialChar: 'Aa1aaaaaaaa',
  empty: '',
} as const;
