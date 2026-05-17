import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const reportsRoot = "playwright-report";

let latestDir;

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

  latestDir = candidates[0]?.fullPath;
} catch {
  latestDir = undefined;
}

if (!latestDir && existsSync(join(reportsRoot, "index.html"))) {
  latestDir = reportsRoot;
}

if (!latestDir) {
  console.error(
    "No Playwright HTML report found (checked playwright-report/run-* and playwright-report/index.html)",
  );
  process.exit(1);
}

console.log(`Opening latest report: ${latestDir}`);

const child = spawn("npx", ["playwright", "show-report", latestDir], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
