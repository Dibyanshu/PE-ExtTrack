import { defineConfig, devices } from "@playwright/test";
import { readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const blobReportRoot = process.env.PW_BLOB_REPORT_ROOT
  ?? join(tmpdir(), "pe-exttrack-playwright-blob-report");
const blobReportFileName = process.env.PW_BLOB_REPORT_FILE
  ?? `run-${new Date().toISOString().replace(/[.:]/g, "-")}.zip`;
const maxBlobReportsToKeep = Number.parseInt(process.env.PW_BLOB_REPORT_MAX_RUNS ?? "10", 10);

const pruneOldBlobReports = (reportsRoot: string, keepCount: number) => {
  if (!Number.isFinite(keepCount) || keepCount < 1) {
    return;
  }

  try {
    const blobReports = readdirSync(reportsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".zip"))
      .map((entry) => {
        const fullPath = join(reportsRoot, entry.name);
        return {
          fullPath,
          mtime: statSync(fullPath).mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    for (const oldReport of blobReports.slice(keepCount)) {
      rmSync(oldReport.fullPath, { force: true });
    }
  } catch {
    // Best-effort cleanup only; do not fail test runs.
  }
};

pruneOldBlobReports(blobReportRoot, maxBlobReportsToKeep);

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
      "blob",
      {
        outputDir: blobReportRoot,
        fileName: blobReportFileName,
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
