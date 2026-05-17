import { defineConfig, devices } from "@playwright/test";

const htmlReportFolder = process.env.PW_HTML_REPORT_DIR
  ?? `playwright-report/run-${new Date().toISOString().replace(/[.:]/g, "-")}`;

/**
 * Base URL is the running frontend dev server.
 * Override via environment variable: BASE_URL=https://staging.example.com npx playwright test
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const API_HEALTH_URL = process.env.API_HEALTH_URL ?? "http://localhost:4000/api/healthz";

export default defineConfig({
  testDir: "./tests",
  /* Run tests in parallel across workers */
  fullyParallel: false, // Keep false – tests share auth state / database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 1,

  /* ── Reporting ── */
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: htmlReportFolder,
        open: "never", // Never auto-open; let CI/developer decide
      },
    ],
  ],

  use: {
    baseURL: BASE_URL,

    /* Trace is recorded for every test; attachments (screenshots/video)
       are captured only on failure to keep artefact size manageable.  */
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    /* Generous timeouts to accommodate API round-trips */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  /* Output directory for test artefacts */
  outputDir: "test-results",

  /* Global test timeout */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  projects: [
    /* ── Setup project: authenticate once and save storage state ── */
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    /* ── Main browser projects reuse the stored auth state ── */
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  /* Start the Vite dev server automatically when running locally */
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "npm run dev",
          cwd: "../backend",
          url: API_HEALTH_URL,
          reuseExistingServer: true,
          timeout: 90_000,
        },
        {
          command: "npm run dev",
          cwd: "../frontend",
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
