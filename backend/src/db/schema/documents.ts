import {
  mysqlTable,
  bigint,
  varchar,
  int,
  timestamp,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";
import { expenseVersions } from "./expenses";

export const documents = mysqlTable("documents", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  expenseVersionId: bigint("expense_version_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => expenseVersions.id),
  voucherNumber: varchar("voucher_number", { length: 32 }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 120 }),
  fileOrder: int("file_order", { unsigned: true }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  storedName: varchar("stored_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }),
  fileSize: bigint("file_size", { mode: "number", unsigned: true }).notNull(),
  relativePath: varchar("relative_path", { length: 500 }).notNull(),
  publicUrl: varchar("public_url", { length: 700 }),
  storageDriver: varchar("storage_driver", { length: 40 }).notNull().default("local"),
  uploadedBy: bigint("uploaded_by", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const selectDocumentSchema = createSelectSchema(documents);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
