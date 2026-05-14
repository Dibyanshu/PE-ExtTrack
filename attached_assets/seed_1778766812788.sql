INSERT IGNORE INTO users (name, email, password_hash, can_view_history, is_active)
VALUES
  ('Super Admin', 'superadmin@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 1, 1),
  ('Admin', 'admin@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 1, 1),
  ('Ali', 'ali@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 1, 1),
  ('Kundu', 'kundu@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 0, 1),
  ('Sameer', 'sameer@parbatienterprises.com', '$2b$12$iu3EEiuZ2nCk11NOUAvlNeD6caro1yC8.v8JpGXL2jTFg5rPyV1MO', 0, 1);

SET @seed_admin_id = (
  SELECT id FROM users WHERE email = 'admin@parbatienterprises.com' LIMIT 1
);

INSERT IGNORE INTO voucher_sequence (id, prefix, current_value)
VALUES (1, 'PECRU', 0);

INSERT IGNORE INTO particulars_master (name, created_by)
VALUES
  ('Civil Work', @seed_admin_id),
  ('Electrical Material', @seed_admin_id),
  ('Plumbing Material', @seed_admin_id),
  ('Labour Charges', @seed_admin_id),
  ('Transport', @seed_admin_id),
  ('Office Expense', @seed_admin_id);

INSERT IGNORE INTO uom_master (name, created_by)
VALUES
  ('Nos', @seed_admin_id),
  ('Kg', @seed_admin_id),
  ('Ltr', @seed_admin_id),
  ('Meter', @seed_admin_id),
  ('Day', @seed_admin_id),
  ('Job', @seed_admin_id);

INSERT IGNORE INTO payment_status_master (name, created_by)
VALUES
  ('Paid', @seed_admin_id),
  ('Pending', @seed_admin_id),
  ('Advance', @seed_admin_id);

INSERT IGNORE INTO project_master (code, name, created_by)
VALUES
  ('PE-CRU', 'PE-CRU', @seed_admin_id),
  ('PE-ITES', 'PE-ITES', @seed_admin_id),
  ('PE-SALON', 'PE-SALON', @seed_admin_id);
