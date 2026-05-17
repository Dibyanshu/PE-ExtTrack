import { existsSync, mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const reportRoots = [
  process.env.PW_HTML_REPORT_ROOT ?? join(tmpdir(), "pe-exttrack-playwright-report"),
  "playwright-report",
];
const blobReportRoot = process.env.PW_BLOB_REPORT_ROOT
  ?? join(tmpdir(), "pe-exttrack-playwright-blob-report");

let latestDir;
let handledByBlobMerge = false;

for (const reportsRoot of reportRoots) {
  try {
    const candidates = readdirSync(reportsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("run-"))
      .map((entry) => {
        const fullPath = join(reportsRoot, entry.name);
        return {
          fullPath,
          mtime: statSync(fullPath).mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (candidates.length > 0) {
      latestDir = candidates[0].fullPath;
      break;
    }
  } catch {
    // Ignore missing/unreadable roots and continue fallback chain.
  }

  if (existsSync(join(reportsRoot, "index.html"))) {
    latestDir = reportsRoot;
    break;
  }
}

const getLatestBlobReport = () => {
  try {
    const blobReports = readdirSync(blobReportRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".zip"))
      .map((entry) => {
        const fullPath = join(blobReportRoot, entry.name);
        return {
          fullPath,
          mtime: statSync(fullPath).mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    return blobReports[0]?.fullPath;
  } catch {
    return undefined;
  }
};

if (!latestDir) {
  const latestBlob = getLatestBlobReport();

  if (latestBlob) {
    handledByBlobMerge = true;
    const mergeWorkDir = mkdtempSync(join(tmpdir(), "pe-exttrack-merged-report-"));
    const merge = spawn("npx", ["playwright", "merge-reports", "--reporter", "html", blobReportRoot], {
      cwd: mergeWorkDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    merge.on("exit", (code) => {
      if (code !== 0) {
        process.exit(code ?? 1);
        return;
      }

      const mergedHtmlDir = join(mergeWorkDir, "playwright-report");
      console.log(`Opening merged report from latest blob: ${latestBlob}`);
      const child = spawn("npx", ["playwright", "show-report", mergedHtmlDir], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });

      child.on("exit", (childCode) => {
        process.exit(childCode ?? 1);
      });
    });

    process.on("uncaughtException", () => {
      process.exit(1);
    });

    process.on("unhandledRejection", () => {
      process.exit(1);
    });
  }
}

if (!latestDir && !handledByBlobMerge) {
  console.error(
    "No Playwright report found (checked temp/workspace HTML folders and blob reports)",
  );
  process.exit(1);
}

if (handledByBlobMerge) {
  // Blob merge branch will open report and exit from event handlers above.
} else {
console.log(`Opening latest report: ${latestDir}`);

const child = spawn("npx", ["playwright", "show-report", latestDir], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
}
