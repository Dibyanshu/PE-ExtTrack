import mysql from "mysql2/promise";

const url = process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("MYSQL_DATABASE_URL required");

async function run() {
  const conn = await mysql.createConnection({ uri: url! });

  // Show tables
  const [tables] = await conn.execute("SHOW TABLES") as any;
  console.log("Tables:", tables.map((r: any) => Object.values(r)[0]));

  // Describe users
  try {
    const [cols] = await conn.execute("DESCRIBE users") as any;
    console.log("\nusers columns:", cols.map((c: any) => `${c.Field} ${c.Type}`));

    const colNames = cols.map((c: any) => c.Field as string);

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
  } catch (e: any) {
    console.log("users table check error:", e.message);
  }

  // Check expenses table for vendor_id and voucher_type
  try {
    const [cols] = await conn.execute("DESCRIBE expenses") as any;
    console.log("\nexpenses columns:", cols.map((c: any) => `${c.Field} ${c.Type}`));
    const colNames = cols.map((c: any) => c.Field as string);

    if (!colNames.includes("vendor_id")) {
      await conn.execute(`ALTER TABLE expenses ADD COLUMN vendor_id BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER project_id`);
      console.log("✓ vendor_id added to expenses");
    }
    if (!colNames.includes("voucher_type")) {
      await conn.execute(`ALTER TABLE expenses ADD COLUMN voucher_type ENUM('payment','receive') NOT NULL DEFAULT 'payment' AFTER vendor_id`);
      console.log("✓ voucher_type added to expenses");
    }
  } catch (e: any) {
    console.log("expenses check:", e.message);
  }

  await conn.end();
  console.log("\nDone.");
}

run().catch((e) => { console.error(e); process.exit(1); });
