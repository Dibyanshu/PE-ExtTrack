import { defineConfig } from "drizzle-kit";

if (!process.env.MYSQL_DATABASE_URL) {
  throw new Error(
    "MYSQL_DATABASE_URL must be set. Provide a MySQL connection string.",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "mysql2",
  dbCredentials: {
    url: process.env.MYSQL_DATABASE_URL,
  },
});
