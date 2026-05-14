import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

interface CountRow {
  cnt: number;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  // Use raw string interpolation — INFORMATION_SCHEMA doesn't accept bind params
  // for identifier comparisons in all MySQL versions/modes.
  const result = await db.execute(
    sql.raw(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${table}'
        AND COLUMN_NAME = '${column}'
    `),
  ) as unknown as [CountRow[], unknown];
  return (result[0][0]?.cnt ?? 0) > 0;
}

export async function runStartupMigrations(): Promise<void> {
  // expenses: deleted_at (soft-delete)
  if (!(await columnExists("expenses", "deleted_at"))) {
    await db.execute(
      sql.raw(`ALTER TABLE expenses ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL`),
    );
  }

  // expenses: approved_by
  if (!(await columnExists("expenses", "approved_by"))) {
    await db.execute(
      sql.raw(`ALTER TABLE expenses ADD COLUMN approved_by BIGINT UNSIGNED NULL`),
    );
  }

  // expenses: approved_at
  if (!(await columnExists("expenses", "approved_at"))) {
    await db.execute(
      sql.raw(`ALTER TABLE expenses ADD COLUMN approved_at TIMESTAMP NULL DEFAULT NULL`),
    );
  }

  // expenses: vendor_id
  if (!(await columnExists("expenses", "vendor_id"))) {
    await db.execute(
      sql.raw(`ALTER TABLE expenses ADD COLUMN vendor_id BIGINT UNSIGNED NOT NULL DEFAULT 1`),
    );
  }

  // expenses: voucher_type
  if (!(await columnExists("expenses", "voucher_type"))) {
    await db.execute(
      sql.raw(`ALTER TABLE expenses ADD COLUMN voucher_type ENUM('payment','receive') NOT NULL DEFAULT 'payment'`),
    );
  }

  // expenses: finalized_by
  if (!(await columnExists("expenses", "finalized_by"))) {
    await db.execute(
      sql.raw(`ALTER TABLE expenses ADD COLUMN finalized_by BIGINT UNSIGNED NULL`),
    );
  }

  // expenses: finalized_at
  if (!(await columnExists("expenses", "finalized_at"))) {
    await db.execute(
      sql.raw(`ALTER TABLE expenses ADD COLUMN finalized_at TIMESTAMP NULL DEFAULT NULL`),
    );
  }

  // users: role
  if (!(await columnExists("users", "role"))) {
    await db.execute(
      sql.raw(`ALTER TABLE users ADD COLUMN role ENUM('expense_entry','accounts','admin','superadmin') NOT NULL DEFAULT 'expense_entry'`),
    );
  }
}
