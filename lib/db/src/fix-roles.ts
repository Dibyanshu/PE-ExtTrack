import mysql from "mysql2/promise";

const url = process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("MYSQL_DATABASE_URL required");

interface UserRow { name: string; email: string; role: string; can_view_history: number }
interface VoucherSeqRow { id: number; prefix: string; current_value: number }

async function run() {
  const conn = await mysql.createConnection({ uri: url! });

  const roleMap: Record<string, string> = {
    "superadmin@parbatienterprises.com": "superadmin",
    "admin@parbatienterprises.com": "admin",
    "ali@parbatienterprises.com": "accounts",
    "kundu@parbatienterprises.com": "expense_entry",
    "sameer@parbatienterprises.com": "expense_entry",
  };

  const canViewHistory: Record<string, number> = {
    "superadmin@parbatienterprises.com": 1,
    "admin@parbatienterprises.com": 1,
    "ali@parbatienterprises.com": 1,
    "kundu@parbatienterprises.com": 0,
    "sameer@parbatienterprises.com": 0,
  };

  for (const [email, role] of Object.entries(roleMap)) {
    await conn.execute(
      "UPDATE users SET role = ?, can_view_history = ? WHERE email = ?",
      [role, canViewHistory[email], email],
    );
    console.log(`✓ ${email} → ${role}`);
  }

  await conn.execute(
    "INSERT IGNORE INTO voucher_sequence (id, prefix, current_value) VALUES (1, 'PECRU-PV', 0), (2, 'PECRU-RV', 0)",
  );
  console.log("✓ voucher_sequence seeded");

  const [rows] = await conn.execute(
    "SELECT name, email, role, can_view_history FROM users ORDER BY id",
  ) as [UserRow[], unknown];
  console.log("\nFinal user list:");
  for (const row of rows) {
    console.log(`  ${row.name} <${row.email}> [${row.role}] history=${row.can_view_history}`);
  }

  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
