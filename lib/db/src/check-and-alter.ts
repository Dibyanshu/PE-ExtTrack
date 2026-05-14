import mysql from "mysql2/promise";

const rawUrl = process.env.DATABASE_URL ?? "";
const url = rawUrl.startsWith("mysql://") || rawUrl.startsWith("mysql2://") ? rawUrl : process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("A MySQL DATABASE_URL (or MYSQL_DATABASE_URL) must be set.");

interface TableRow { [key: string]: string }
interface ColumnRow { Field: string; Type: string }
interface MySQLError extends Error { code?: string }

async function run() {
  const conn = await mysql.createConnection({ uri: url! });

  const [tables] = await conn.execute("SHOW TABLES") as [TableRow[], unknown];
  console.log("Tables:", tables.map((r) => Object.values(r)[0]));

  try {
    const [cols] = await conn.execute("DESCRIBE users") as [ColumnRow[], unknown];
    console.log("\nusers columns:", cols.map((c) => `${c.Field} ${c.Type}`));

    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes("role")) {
      console.log("Adding role column...");
      await conn.execute(`ALTER TABLE users ADD COLUMN role ENUM('expense_entry','accounts','admin','superadmin') NOT NULL DEFAULT 'expense_entry' AFTER password_hash`);
      console.log("✓ role added");
    }
    if (!colNames.includes("can_view_history")) {
      console.log("Adding can_view_history...");
      await conn.execute(`ALTER TABLE users ADD COLUMN can_view_history TINYINT NOT NULL DEFAULT 0`);
      console.log("✓ can_view_history added");
    }
    if (!colNames.includes("is_active")) {
      console.log("Adding is_active...");
      await conn.execute(`ALTER TABLE users ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1`);
      console.log("✓ is_active added");
    }
    if (!colNames.includes("password_hash")) {
      console.log("Adding password_hash...");
      await conn.execute(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''`);
      console.log("✓ password_hash added");
    }
  } catch (e) {
    const err = e as MySQLError;
    console.log("users table check error:", err.message);
  }

  try {
    const [cols] = await conn.execute("DESCRIBE expenses") as [ColumnRow[], unknown];
    console.log("\nexpenses columns:", cols.map((c) => `${c.Field} ${c.Type}`));
    const colNames = cols.map((c) => c.Field);

    if (!colNames.includes("vendor_id")) {
      await conn.execute(`ALTER TABLE expenses ADD COLUMN vendor_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER project_id`);
      console.log("✓ vendor_id added to expenses");
    }
    if (!colNames.includes("voucher_type")) {
      await conn.execute(`ALTER TABLE expenses ADD COLUMN voucher_type ENUM('payment','receive') NOT NULL DEFAULT 'payment' AFTER vendor_id`);
      console.log("✓ voucher_type added to expenses");
    }
  } catch (e) {
    const err = e as MySQLError;
    console.log("expenses check:", err.message);
  }

  await conn.end();
  console.log("\nDone.");
}

run().catch((e) => { console.error(e); process.exit(1); });
