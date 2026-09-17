import { mergeTests } from '@playwright/test';
import { test as accountTest, expect } from '../../src/fixtures/account.fixtures';
import { test as uiPageTest } from '../../src/fixtures/ui-page.fixtures';
import { buildRegisterDetails } from '../../src/data/register-details.factory';
import { deleteSeededUser } from '../../src/fixtures/seed-user.util';
import { CreateUserResponseSchema } from '../../src/types/account.schema';
import { parseJsonBody } from '../../src/utils/api-response.util';

const test = mergeTests(accountTest, uiPageTest);

// Which submit method a case uses states where its submission is expected to
// stop: registerAs() for anything reaching the server (it verifies reCAPTCHA
// first, without which the form blocks itself), and
// registerExpectingClientSideRejection() for cases the required-field check
// rejects before the captcha flag is read.

test.describe('Registration form', () => {
  test(
    'Submit the form with the first name missing',
    { tag: ['@REGISTER-FORM-001', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerExpectingClientSideRejection(
        buildRegisterDetails({ firstName: '' })
      );

      await expect.soft(registerPage.firstNameField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with the last name missing',
    { tag: ['@REGISTER-FORM-002', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerExpectingClientSideRejection(
        buildRegisterDetails({ lastName: '' })
      );

      await expect.soft(registerPage.lastNameField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with the username missing',
    { tag: ['@REGISTER-FORM-003', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerExpectingClientSideRejection(
        buildRegisterDetails({ userName: '' })
      );

      await expect.soft(registerPage.usernameField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with the password missing',
    { tag: ['@REGISTER-FORM-004', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerExpectingClientSideRejection(
        buildRegisterDetails({ password: '' })
      );

      await expect.soft(registerPage.passwordField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with every field empty',
    { tag: ['@REGISTER-FORM-005', '@boundary'] },
    async ({ registerPage }) => {
      await registerPage.registerExpectingClientSideRejection(
        buildRegisterDetails({ firstName: '', lastName: '', userName: '', password: '' })
      );

      await expect.soft(registerPage.firstNameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.lastNameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.usernameField()).toHaveClass(/is-invalid/);
      await expect.soft(registerPage.passwordField()).toHaveClass(/is-invalid/);
    }
  );

  test(
    'Submit the form with whitespace-only values',
    { tag: ['@REGISTER-FORM-006', '@boundary'] },
    async ({ registerPage }) => {
      await registerPage.registerAs(
        buildRegisterDetails({
          firstName: '   ',
          lastName: '   ',
          userName: '   ',
          password: '   ',
        })
      );

      await expect
        .soft(registerPage.errorMessage())
        .toHaveText(
          "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer."
        );
    }
  );

  test(
    'Register with valid details',
    { tag: ['@REGISTER-FORM-007', '@positive'] },
    async ({ page, registerPage, accountApiClient }) => {
      // The username is unique per run (user.factory.ts), so the account
      // genuinely does not exist on the shared backend and a re-run is not
      // rejected as a duplicate.
      const details = buildRegisterDetails();

      // The account's id, for teardown. Registering through the UI *is* a
      // POST /Account/v1/User, and its 201 body carries userID — so the id is
      // recoverable, by reading the response the page itself receives. The
      // older belief that it was unrecoverable is what put this teardown
      // through the UI (sign in, then /profile's Delete Account), where
      // cleanup depended on rendering, scroll position and advertisement
      // iframes and orphaned an account roughly 1 run in 12.
      //
      // Both captures are subscribed before the submission, or the response
      // and the alert are missed.
      const createdResponse = registerPage.captureNextRegistrationResponse();
      const dialogMessage = registerPage.captureNextDialogMessage();
      await registerPage.registerAs(details);

      // Parsed through parseJsonBody with the same schema the API suite uses,
      // so a shape change fails here with the project's diagnosable error
      // rather than surfacing as an undefined id inside teardown.
      const created = await parseJsonBody(await createdResponse, CreateUserResponseSchema);

      // finally, because `await dialogMessage` can throw and the account
      // already exists — a plain statement after the assertions would be
      // skipped and orphan it (Risk-1, docs/test-plan.md §8). No catch: that
      // would hide the failure, and deleteSeededUser() logs rather than throws.
      try {
        // The success signal is a native browser alert, not an in-page
        // element (docs/ui-spec/register-form.requirements.md, Element
        // reference).
        expect.soft(await dialogMessage).toBe('User Registered Successfully.');
        await expect.soft(registerPage.firstNameField()).toHaveValue('');
        await expect.soft(registerPage.lastNameField()).toHaveValue('');
        await expect.soft(registerPage.usernameField()).toHaveValue('');
        await expect.soft(registerPage.passwordField()).toHaveValue('');
        await expect.soft(page).toHaveURL(/\/register$/);
      } finally {
        // The same helper every API fixture tears down with: it re-acquires a
        // token, deletes, and logs the orphaned id rather than throwing, so a
        // cleanup problem can never fail an otherwise-passing test.
        await deleteSeededUser(
          accountApiClient,
          { userName: details.userName, password: details.password },
          created.userID
        );
      }
    }
  );

  test(
    'Register with a password below the complexity rule',
    { tag: ['@REGISTER-FORM-008', '@negative'] },
    async ({ registerPage }) => {
      await registerPage.registerAs(buildRegisterDetails({ password: 'weak' }));

      // DIVERGENCE-2: the field's complexity `pattern` attribute is
      // decorative — the form submits anyway and the server rejects it. This
      // asserts the observed server-side path, not client-side blocking.
      await expect(registerPage.errorMessage()).toHaveText(
        "Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer."
      );
    }
  );
});
