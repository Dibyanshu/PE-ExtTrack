import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface ColumnRow {
  Field: string;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await db.execute(
    sql`SELECT Field FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ${table}
          AND COLUMN_NAME = ${column}`,
  ) as unknown as [ColumnRow[], unknown];
  return rows[0].length > 0;
}

export async function runStartupMigrations(): Promise<void> {
  // expenses: deleted_at (soft-delete)
  if (!(await columnExists("expenses", "deleted_at"))) {
    await db.execute(
      sql`ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL`,
    );
  }

  // expenses: approved_by
  if (!(await columnExists("expenses", "approved_by"))) {
    await db.execute(
      sql`ALTER TABLE expenses ADD COLUMN approved_by BIGINT UNSIGNED NULL`,
    );
  }

  // expenses: approved_at
  if (!(await columnExists("expenses", "approved_at"))) {
    await db.execute(
      sql`ALTER TABLE expenses ADD COLUMN approved_at TIMESTAMP NULL DEFAULT NULL`,
    );
  }

  // expenses: vendor_id (may be missing in older installs)
  if (!(await columnExists("expenses", "vendor_id"))) {
    await db.execute(
      sql`ALTER TABLE expenses ADD COLUMN vendor_id BIGINT UNSIGNED NOT NULL DEFAULT 1`,
    );
  }

  // expenses: voucher_type (may be missing in older installs)
  if (!(await columnExists("expenses", "voucher_type"))) {
    await db.execute(
      sql`ALTER TABLE expenses ADD COLUMN voucher_type ENUM('payment','receive') NOT NULL DEFAULT 'payment'`,
    );
  }

  // users: role (may be missing in older installs)
  if (!(await columnExists("users", "role"))) {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN role ENUM('expense_entry','accounts','admin','superadmin') NOT NULL DEFAULT 'expense_entry'`,
    );
  }
}
