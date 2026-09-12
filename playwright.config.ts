import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import './src/utils/matchers.util';

dotenv.config();

// Fail fast with an actionable message rather than letting an undefined
// baseURL surface later as an opaque "Invalid URL" inside an API client.
const baseURL = process.env.BASE_URL;
if (!baseURL) {
  throw new Error(
    'BASE_URL is not set. Copy .env.example to .env for local runs, or set it in the CI workflow environment.'
  );
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  /* Root only — each project narrows this to its own layer (see `projects`). */
  testDir: './tests',
  /* Every test seeds and tears down its own data (src/fixtures), so no test
     depends on another's state or on execution order. */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Fixed worker count everywhere rather than Playwright's core-count default:
     the API tests are I/O-bound, waiting on a remote sandbox, so useful
     concurrency is not limited by CPU cores. Locally this also sidesteps the
     "half the cores" default, which collapses to 1 worker on a 2-core laptop.
     Worker count is per-run, not per-project, so this figure is shared with
     the browser-bound UI suite; if UI runs show CPU contention, lower it here
     rather than adding machinery to vary it by layer. */
  workers: process.env.CI ? 4 : 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        // never auto-open the report in CI — it would hang the runner
        ['html', { open: 'never' }],
        // renders pass/fail counts directly in the GitHub Actions run summary
        ['github'],
        // machine-readable results, published alongside the HTML report
        ['json', { outputFile: 'playwright-report/results.json' }],
      ]
    : [['html', { open: 'on-failure' }], ['list']],
  /* DemoQA is a public sandbox with variable latency, so both timeouts are
     declared explicitly rather than inherited from Playwright's defaults —
     an undeclared timeout is a hidden assumption about how slow the sandbox
     is allowed to be. These are ceilings for the auto-retrying assertions,
     not sleeps: nothing waits the full duration on a passing run, which is
     why raising them is not the same mistake as a manual wait. */
  timeout: 45_000,
  expect: { timeout: 10_000 },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    trace: 'on-first-retry', //trace collection on retries
    video: 'retain-on-failure', //record videos only when tests fail
    screenshot: 'only-on-failure', //still frame at the point of failure
  },

  /* Split by layer, not by browser. The two suites have genuinely different
     needs: API tests drive an APIRequestContext and launch no browser at all,
     so a device descriptor is meaningless for them, while UI tests need one.
     Selecting a layer is also the common case day to day (`--project=ui`),
     which the npm test:api / test:ui scripts already assume. */
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      /* No `devices` spread: these tests never open a page. */
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
