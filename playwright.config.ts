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
  testDir: './tests',
  /* Every test seeds and tears down its own data (src/fixtures), so no test
     depends on another's state or on execution order. */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Fixed worker count on CI rather than the core-count default: these are
     I/O-bound API tests waiting on a remote sandbox, so useful concurrency is
     not limited by the runner's 2 cores. Locally, Playwright's default (half
     the available cores) is left alone. */
  workers: process.env.CI ? 4 : undefined,
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
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    trace: 'on-first-retry', //trace collection on retries
    video: 'retain-on-failure', //record videos only when tests fail
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
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
