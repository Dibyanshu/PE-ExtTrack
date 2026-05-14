import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const url = process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("MYSQL_DATABASE_URL required");

interface UserRow { name: string; email: string; role: string }

async function run() {
  const hash = await bcrypt.hash("Parbati@123", 12);
  console.log("Generated hash:", hash);

  const conn = await mysql.createConnection({ uri: url! });
  await conn.execute("UPDATE users SET password_hash = ?", [hash]);

  const [rows] = await conn.execute(
    "SELECT name, email, role FROM users ORDER BY id",
  ) as [UserRow[], unknown];
  console.log("Users in DB:");
  for (const row of rows) {
    console.log(" -", row.name, `<${row.email}>`, `[${row.role}]`);
  }
  await conn.end();
  console.log("\nDone — all passwords set to: Parbati@123");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
