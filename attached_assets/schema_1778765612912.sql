CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  can_view_history TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS particulars_master (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_particulars_name (name),
  CONSTRAINT fk_particulars_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS uom_master (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_uom_name (name),
  CONSTRAINT fk_uom_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payment_status_master (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_status_name (name),
  CONSTRAINT fk_payment_status_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_master (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(180) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_code (code),
  UNIQUE KEY uq_project_name (name),
  CONSTRAINT fk_project_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  current_version_id BIGINT UNSIGNED NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_project FOREIGN KEY (project_id) REFERENCES project_master(id),
  CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expense_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  expense_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  voucher_number VARCHAR(32) NOT NULL,
  expense_date DATE NOT NULL,
  particular_id BIGINT UNSIGNED NOT NULL,
  description TEXT NULL,
  transaction_details TEXT NULL,
  uom_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  price_per_unit DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  invoice_number VARCHAR(120) NULL,
  payment_status_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_expense_version (expense_id, version_no),
  INDEX idx_expense_versions_date (expense_date),
  CONSTRAINT fk_versions_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
  CONSTRAINT fk_versions_particular FOREIGN KEY (particular_id) REFERENCES particulars_master(id),
  CONSTRAINT fk_versions_uom FOREIGN KEY (uom_id) REFERENCES uom_master(id),
  CONSTRAINT fk_versions_payment_status FOREIGN KEY (payment_status_id) REFERENCES payment_status_master(id),
  CONSTRAINT fk_versions_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_current_version FOREIGN KEY (current_version_id) REFERENCES expense_versions(id);

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  expense_version_id BIGINT UNSIGNED NOT NULL,
  voucher_number VARCHAR(32) NOT NULL,
  invoice_number VARCHAR(120) NULL,
  file_order INT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  relative_path VARCHAR(500) NOT NULL,
  public_url VARCHAR(700) NULL,
  storage_driver VARCHAR(40) NOT NULL DEFAULT 'local',
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_document_order (expense_version_id, file_order),
  CONSTRAINT fk_documents_version FOREIGN KEY (expense_version_id) REFERENCES expense_versions(id),
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  user_id BIGINT UNSIGNED NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS voucher_sequence (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  prefix VARCHAR(16) NOT NULL,
  current_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
