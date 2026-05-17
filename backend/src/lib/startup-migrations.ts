import { db } from "../db";
import { sql } from "drizzle-orm";

interface CountRow {
  cnt: number;
}

interface IdRow {
  id: number;
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

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const result = await db.execute(
    sql.raw(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${table}'
        AND INDEX_NAME = '${indexName}'
    `),
  ) as unknown as [CountRow[], unknown];
  return (result[0][0]?.cnt ?? 0) > 0;
}

async function usersProjectFkExists(): Promise<boolean> {
  const result = await db.execute(
    sql.raw(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'project_id'
        AND REFERENCED_TABLE_NAME = 'project_master'
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

  // users: project_id (required)
  if (!(await columnExists("users", "project_id"))) {
    await db.execute(
      sql.raw(`ALTER TABLE users ADD COLUMN project_id BIGINT UNSIGNED NULL`),
    );
  }

  const [defaultProject] = await db.execute(
    sql.raw(`SELECT id FROM project_master WHERE code = 'PE-CRU' LIMIT 1`),
  ) as unknown as [IdRow[], unknown];

  let defaultProjectId = defaultProject[0]?.id;

  if (!defaultProjectId) {
    await db.execute(
      sql.raw(`INSERT INTO project_master (code, name, created_by) VALUES ('PE-CRU', 'PE-CRU', NULL)`),
    );
    const [insertedProject] = await db.execute(
      sql.raw(`SELECT id FROM project_master WHERE code = 'PE-CRU' LIMIT 1`),
    ) as unknown as [IdRow[], unknown];
    defaultProjectId = insertedProject[0]?.id;
  }

  if (defaultProjectId) {
    await db.execute(
      sql.raw(`UPDATE users SET project_id = ${Number(defaultProjectId)} WHERE project_id IS NULL`),
    );
  }

  await db.execute(
    sql.raw(`ALTER TABLE users MODIFY COLUMN project_id BIGINT UNSIGNED NOT NULL`),
  );

  if (!(await indexExists("users", "idx_users_project_id"))) {
    await db.execute(
      sql.raw(`ALTER TABLE users ADD INDEX idx_users_project_id (project_id)`),
    );
  }

  if (!(await usersProjectFkExists())) {
    await db.execute(
      sql.raw(`ALTER TABLE users ADD CONSTRAINT fk_users_project_id FOREIGN KEY (project_id) REFERENCES project_master(id)`),
    );
  }
}
