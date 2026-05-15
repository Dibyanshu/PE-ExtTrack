import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql, eq } from "drizzle-orm";
import * as schema from "./schema";

const {
  users,
  particularsMaster,
  uomMaster,
  paymentStatusMaster,
  projectMaster,
  voucherSequence,
} = schema;

async function seed() {
  if (!process.env.MYSQL_DATABASE_URL) {
    throw new Error("MYSQL_DATABASE_URL is required");
  }
  const pool = mysql.createPool({ uri: process.env.MYSQL_DATABASE_URL });
  const db = drizzle(pool, { schema, mode: "default" });

  console.log("Seeding database...");

  await db.execute(sql`INSERT IGNORE INTO users (name, email, password_hash, role, can_view_history, is_active)
    VALUES
      ('Super Admin', 'superadmin@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 'superadmin', 1, 1),
      ('Admin', 'admin@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 'admin', 1, 1),
      ('Ali', 'ali@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 'accounts', 1, 1),
      ('Kundu', 'kundu@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 'expense_entry', 0, 1),
      ('Sameer', 'sameer@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 'expense_entry', 0, 1)
  `);

  const [adminRows] = await db.select({ id: users.id }).from(users).where(eq(users.email, "admin@parbatienterprises.com")).limit(1);
  const adminId = adminRows?.id;

  await db.execute(sql`INSERT IGNORE INTO voucher_sequence (id, prefix, current_value)
    VALUES (1, 'PECRU-PV', 0), (2, 'PECRU-RV', 0)`);

  await db.execute(sql`INSERT IGNORE INTO particulars_master (name, created_by) VALUES
    ('Civil Work', ${adminId}),
    ('Electrical Material', ${adminId}),
    ('Plumbing Material', ${adminId}),
    ('Labour Charges', ${adminId}),
    ('Transport', ${adminId}),
    ('Office Expense', ${adminId})`);

  await db.execute(sql`INSERT IGNORE INTO uom_master (name, created_by) VALUES
    ('Nos', ${adminId}),
    ('Kg', ${adminId}),
    ('Ltr', ${adminId}),
    ('Meter', ${adminId}),
    ('Day', ${adminId}),
    ('Job', ${adminId})`);

  await db.execute(sql`INSERT IGNORE INTO payment_status_master (name, created_by) VALUES
    ('Paid', ${adminId}),
    ('Pending', ${adminId}),
    ('Advance', ${adminId})`);

  await db.execute(sql`INSERT IGNORE INTO project_master (code, name, created_by) VALUES
    ('PE-CRU', 'PE-CRU', ${adminId}),
    ('PE-ITES', 'PE-ITES', ${adminId}),
    ('PE-SALON', 'PE-SALON', ${adminId})`);

  console.log("Seeding complete.");
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
