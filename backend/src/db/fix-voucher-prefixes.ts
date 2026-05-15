import mysql from "mysql2/promise";

const rawUrl = process.env.DATABASE_URL ?? "";
const url = rawUrl.startsWith("mysql://") || rawUrl.startsWith("mysql2://") ? rawUrl : process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("A MySQL DATABASE_URL (or MYSQL_DATABASE_URL) must be set.");

interface VoucherSeqRow { id: number; prefix: string; current_value: number }
interface ColumnRow { Field: string; Type: string }

async function run() {
  const conn = await mysql.createConnection({ uri: url! });

  const [rows] = await conn.execute("SELECT * FROM voucher_sequence") as [VoucherSeqRow[], unknown];
  console.log("Current voucher_sequence:", rows);

  const [cols] = await conn.execute("DESCRIBE expense_versions") as [ColumnRow[], unknown];
  console.log("expense_versions columns:", cols.map((c) => `${c.Field}(${c.Type})`).join(", "));

  await conn.execute("UPDATE voucher_sequence SET prefix = 'PECRU-PV' WHERE id = 1 AND prefix != 'PECRU-PV'");
  await conn.execute("UPDATE voucher_sequence SET prefix = 'PECRU-RV' WHERE id = 2 AND prefix != 'PECRU-RV'");

  const [updated] = await conn.execute("SELECT * FROM voucher_sequence") as [VoucherSeqRow[], unknown];
  console.log("Updated voucher_sequence:", updated);

  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
