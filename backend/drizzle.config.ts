import { defineConfig } from "drizzle-kit";

// Accept DATABASE_URL only when it is a MySQL connection string.
// Replit also injects DATABASE_URL for its managed Postgres instance.
const rawDataUrl = process.env.DATABASE_URL ?? "";
const dbUrl =
  rawDataUrl.startsWith("mysql://") || rawDataUrl.startsWith("mysql2://")
    ? rawDataUrl
    : process.env.MYSQL_DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "A MySQL DATABASE_URL (or MYSQL_DATABASE_URL) must be set.",
  );
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  dialect: "mysql2",
  dbCredentials: {
    url: dbUrl,
  },
});
