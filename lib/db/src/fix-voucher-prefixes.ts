import mysql from "mysql2/promise";

const url = process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("MYSQL_DATABASE_URL required");

async function run() {
  const conn = await mysql.createConnection({ uri: url! });

  // Show current voucher_sequence state
  const [rows] = await conn.execute("SELECT * FROM voucher_sequence") as any[];
  console.log("Current voucher_sequence:", rows);

  // Show columns of expense_versions
  const [cols] = await conn.execute("DESCRIBE expense_versions") as any[];
  console.log("expense_versions columns:", cols.map((c: any) => `${c.Field}(${c.Type})`).join(", "));

  // Update prefixes to include the type suffix
  await conn.execute("UPDATE voucher_sequence SET prefix = 'PECRU-PV' WHERE id = 1 AND prefix != 'PECRU-PV'");
  await conn.execute("UPDATE voucher_sequence SET prefix = 'PECRU-RV' WHERE id = 2 AND prefix != 'PECRU-RV'");

  const [updated] = await conn.execute("SELECT * FROM voucher_sequence") as any[];
  console.log("Updated voucher_sequence:", updated);

  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
