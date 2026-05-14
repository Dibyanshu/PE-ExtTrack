import {
  mysqlTable,
  bigint,
  varchar,
  timestamp,
  text,
  decimal,
  date,
  int,
  mysqlEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { particularsMaster, uomMaster, paymentStatusMaster, projectMaster, vendorMaster } from "./masters";

export const expenses = mysqlTable("expenses", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  currentVersionId: bigint("current_version_id", { mode: "number", unsigned: true }),
  projectId: bigint("project_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => projectMaster.id),
  vendorId: bigint("vendor_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => vendorMaster.id),
  voucherType: mysqlEnum("voucher_type", ["payment", "receive"]).notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

export const expenseVersions = mysqlTable(
  "expense_versions",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    expenseId: bigint("expense_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => expenses.id),
    versionNo: int("version_no", { unsigned: true }).notNull(),
    voucherNumber: varchar("voucher_number", { length: 32 }).notNull(),
    expenseDate: date("expense_date").notNull(),
    particularId: bigint("particular_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => particularsMaster.id),
    description: text("description"),
    transactionDetails: text("transaction_details"),
    uomId: bigint("uom_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => uomMaster.id),
    quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
    pricePerUnit: decimal("price_per_unit", { precision: 12, scale: 2 }).notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    invoiceNumber: varchar("invoice_number", { length: 120 }),
    paymentStatusId: bigint("payment_status_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => paymentStatusMaster.id),
    createdBy: bigint("created_by", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("uq_expense_version").on(t.expenseId, t.versionNo),
    index("idx_expense_versions_date").on(t.expenseDate),
  ],
);

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  currentVersionId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExpenseVersionSchema = createInsertSchema(expenseVersions).omit({
  id: true,
  createdAt: true,
});

export const selectExpenseSchema = createSelectSchema(expenses);
export const selectExpenseVersionSchema = createSelectSchema(expenseVersions);

export type Expense = typeof expenses.$inferSelect;
export type ExpenseVersion = typeof expenseVersions.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertExpenseVersion = z.infer<typeof insertExpenseVersionSchema>;
