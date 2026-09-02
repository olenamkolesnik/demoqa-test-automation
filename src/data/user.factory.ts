import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import type { LoginPayload } from '../types/account.schema';

// Short, unique-enough suffix for both usernames and passwords — guarantees
// uniqueness across parallel workers (playwright.config.ts runs fullyParallel)
// without pulling in a full UUID's length.
function randomSuffix(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

// Prefixed and suffixed for two different reasons: "qa_" makes any orphaned
// user left on the shared public backend after a crashed run identifiable
// for manual cleanup; the suffix guarantees uniqueness across parallel workers.
export function buildUniqueUsername(): string {
  return `qa_${faker.internet.username()}_${randomSuffix()}`;
}

// Hand-rolled, not faker's internet.password() — this guarantees all four
// required character classes by construction, matching the confirmed real
// rule in docs/api-spec/account-endpoints.md (>=8 chars, upper, lower,
// digit, special char). Faker's generator doesn't reliably satisfy that.
export function buildValidPassword(): string {
  return `Aa1!${randomSuffix()}`;
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
//
// Every character-class value is exactly 8 chars — the minimum valid length —
// so length is satisfied and the named rule is the only one violated. A longer
// value would still fail, but it would no longer isolate a single invalid
// class, which is the whole point of AUTH-002 through AUTH-005.
export const invalidPasswords = {
  tooShort: 'Aa1!aaa', // 7 chars — one below minimum, all four classes present
  noUppercase: 'aa1!aaaa',
  noLowercase: 'AA1!AAAA',
  noDigit: 'Aaaa!aaa',
  noSpecialChar: 'Aa1aaaaa',
  empty: '',
} as const;
