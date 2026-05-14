import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.MYSQL_DATABASE_URL) {
  throw new Error("MYSQL_DATABASE_URL must be set. Provide a MySQL connection string.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "mysql2",
  dbCredentials: {
    url: process.env.MYSQL_DATABASE_URL,
  },
});
