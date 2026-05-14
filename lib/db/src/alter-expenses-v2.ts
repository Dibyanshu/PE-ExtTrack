import mysql from "mysql2/promise";

const url = process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("MYSQL_DATABASE_URL required");

async function run() {
  const conn = await mysql.createConnection({ uri: url! });

  const [cols] = await conn.execute("DESCRIBE expenses") as [Array<{ Field: string }>, unknown];
  const colNames = cols.map((c) => c.Field);
  console.log("Current expenses columns:", colNames.join(", "));

  if (!colNames.includes("deleted_at")) {
    await conn.execute(
      "ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL",
    );
    console.log("✓ deleted_at added");
  } else {
    console.log("  deleted_at already exists");
  }

  if (!colNames.includes("approved_by")) {
    await conn.execute(
      "ALTER TABLE expenses ADD COLUMN approved_by BIGINT UNSIGNED NULL REFERENCES users(id)",
    );
    console.log("✓ approved_by added");
  } else {
    console.log("  approved_by already exists");
  }

  if (!colNames.includes("approved_at")) {
    await conn.execute(
      "ALTER TABLE expenses ADD COLUMN approved_at TIMESTAMP NULL DEFAULT NULL",
    );
    console.log("✓ approved_at added");
  } else {
    console.log("  approved_at already exists");
  }

  await conn.end();
  console.log("\nMigration complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
