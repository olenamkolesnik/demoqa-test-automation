import { faker } from '@faker-js/faker';
// From src/forms/, not from the page object: src/data/ sits on the API chain
// and must not depend on src/ui/ (docs/coding-standards.md, Dependency
// direction). src/forms/ is a leaf both chains may import.
import type { RegisterDetails } from '../forms/register-details';
import { buildUniqueUsername, buildValidPassword } from './user.factory';

// Mirrors buildNewUserPayload()'s shape for the registration form's extra two
// fields. firstName/lastName are faker-generated because no test case in
// docs/test-cases/ui/auth/register-form.md asserts on their text — every
// expected result checks a class marking, an exact username/password value,
// or an exact server message, never the name itself, so there is nothing for
// a fixed literal to buy over a random one. userName/password reuse
// user.factory.ts's own builders rather than duplicating the qa_ prefix /
// random-suffix / character-class logic.
export function buildRegisterDetails(overrides?: Partial<RegisterDetails>): RegisterDetails {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    userName: buildUniqueUsername(),
    password: buildValidPassword(),
    ...overrides,
  };
}
