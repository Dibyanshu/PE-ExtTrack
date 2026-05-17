import mysql from "mysql2/promise";

const rawUrl = process.env.DATABASE_URL ?? "";
const url = rawUrl.startsWith("mysql://") || rawUrl.startsWith("mysql2://") ? rawUrl : process.env.MYSQL_DATABASE_URL;
if (!url) throw new Error("A MySQL DATABASE_URL (or MYSQL_DATABASE_URL) must be set.");

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('expense_entry','accounts','admin','superadmin') NOT NULL DEFAULT 'expense_entry',
  project_id BIGINT UNSIGNED NOT NULL,
  can_view_history TINYINT NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS particulars_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL UNIQUE,
  created_by BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS uom_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_by BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payment_status_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_by BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL UNIQUE,
  created_by BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_project
  FOREIGN KEY (project_id) REFERENCES project_master(id);

CREATE TABLE IF NOT EXISTS vendor_master (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL UNIQUE,
  contact_person VARCHAR(120),
  phone VARCHAR(20),
  email VARCHAR(180),
  address VARCHAR(500),
  is_active TINYINT NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  current_version_id BIGINT UNSIGNED,
  project_id BIGINT UNSIGNED NOT NULL,
  vendor_id BIGINT UNSIGNED NOT NULL,
  voucher_type ENUM('payment','receive') NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES project_master(id),
  FOREIGN KEY (vendor_id) REFERENCES vendor_master(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expense_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  voucher_number VARCHAR(32) NOT NULL,
  expense_date DATE NOT NULL,
  particular_id BIGINT UNSIGNED NOT NULL,
  description TEXT,
  transaction_details TEXT,
  uom_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  price_per_unit DECIMAL(12,2) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  invoice_number VARCHAR(120),
  payment_status_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_expense_version (expense_id, version_no),
  INDEX idx_expense_versions_date (expense_date),
  FOREIGN KEY (expense_id) REFERENCES expenses(id),
  FOREIGN KEY (particular_id) REFERENCES particulars_master(id),
  FOREIGN KEY (uom_id) REFERENCES uom_master(id),
  FOREIGN KEY (payment_status_id) REFERENCES payment_status_master(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_current_version
  FOREIGN KEY (current_version_id) REFERENCES expense_versions(id);

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_version_id BIGINT UNSIGNED NOT NULL,
  voucher_number VARCHAR(32) NOT NULL,
  invoice_number VARCHAR(120),
  file_order INT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120),
  file_size BIGINT UNSIGNED NOT NULL,
  relative_path VARCHAR(500) NOT NULL,
  public_url VARCHAR(700),
  storage_driver VARCHAR(40) NOT NULL DEFAULT 'local',
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_version_id) REFERENCES expense_versions(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  old_value JSON,
  new_value JSON,
  user_id BIGINT UNSIGNED,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS voucher_sequence (
  id TINYINT UNSIGNED PRIMARY KEY,
  prefix VARCHAR(16) NOT NULL,
  current_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

async function migrate() {
  const conn = await mysql.createConnection({ uri: url });
  const statements = DDL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      const firstLine = stmt.split("\n")[0].slice(0, 60);
      console.log("✓", firstLine);
    } catch (err) {
      const e = err as NodeJS.ErrnoException & { code?: string; errno?: number; sqlMessage?: string };
      if (e.code === "ER_DUP_KEYNAME" || e.code === "ER_FK_DUP_NAME" || e.errno === 1826 || e.message?.includes("Duplicate key name") || e.message?.includes("already exists")) {
        console.log("~ skipped (already exists):", stmt.split("\n")[0].slice(0, 60));
      } else {
        console.error("✗ Error:", e.message, "\n  on:", stmt.split("\n")[0]);
      }
    }
  }

  await conn.end();
  console.log("\nMigration complete.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
