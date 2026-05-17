import mysql from "mysql2/promise";

const rawUrl = process.env.DATABASE_URL ?? "";
const url = rawUrl.startsWith("mysql://") || rawUrl.startsWith("mysql2://")
  ? rawUrl
  : process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("A MySQL DATABASE_URL (or MYSQL_DATABASE_URL) must be set.");

interface ColumnRow {
  Field: string;
}

interface IdRow {
  id: number;
}

interface CountRow {
  cnt: number;
}

async function run() {
  const conn = await mysql.createConnection({ uri: url });

  const [projectRows] = await conn.execute(
    "SELECT id FROM project_master WHERE code = 'PE-CRU' LIMIT 1",
  ) as [IdRow[], unknown];

  let defaultProjectId = projectRows[0]?.id;

  if (!defaultProjectId) {
    const [insertResult] = await conn.execute(
      "INSERT INTO project_master (code, name, created_by) VALUES ('PE-CRU', 'PE-CRU', NULL)",
    ) as [{ insertId: number }, unknown];
    defaultProjectId = insertResult.insertId;
    console.log("✓ Created PE-CRU project with id", defaultProjectId);
  }

  const [userCols] = await conn.execute("DESCRIBE users") as [ColumnRow[], unknown];
  const userColNames = userCols.map((c) => c.Field);

  if (!userColNames.includes("project_id")) {
    await conn.execute("ALTER TABLE users ADD COLUMN project_id BIGINT UNSIGNED NULL");
    console.log("✓ Added users.project_id column");
  } else {
    console.log("~ users.project_id already exists");
  }

  await conn.execute("UPDATE users SET project_id = ? WHERE project_id IS NULL", [defaultProjectId]);
  console.log("✓ Backfilled users.project_id for existing users");

  await conn.execute("ALTER TABLE users MODIFY COLUMN project_id BIGINT UNSIGNED NOT NULL");
  console.log("✓ Enforced users.project_id NOT NULL");

  const [indexRows] = await conn.execute(
    "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_project_id'",
  ) as [CountRow[], unknown];
  const hasProjectIndex = (indexRows[0]?.cnt ?? 0) > 0;

  if (!hasProjectIndex) {
    await conn.execute("ALTER TABLE users ADD INDEX idx_users_project_id (project_id)");
    console.log("✓ Added idx_users_project_id");
  } else {
    console.log("~ idx_users_project_id already exists");
  }

  const [fkRows] = await conn.execute(
    "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'project_id' AND REFERENCED_TABLE_NAME = 'project_master'",
  ) as [CountRow[], unknown];
  const hasFk = (fkRows[0]?.cnt ?? 0) > 0;

  if (!hasFk) {
    await conn.execute(
      "ALTER TABLE users ADD CONSTRAINT fk_users_project_id FOREIGN KEY (project_id) REFERENCES project_master(id)",
    );
    console.log("✓ Added fk_users_project_id");
  } else {
    console.log("~ users.project_id foreign key already exists");
  }

  await conn.end();
  console.log("\nUser project migration complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
