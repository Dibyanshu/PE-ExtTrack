import {
  mysqlTable,
  bigint,
  varchar,
  tinyint,
  timestamp,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const particularsMaster = mysqlTable("particulars_master", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar({ length: 180 }).notNull().unique(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const uomMaster = mysqlTable("uom_master", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar({ length: 80 }).notNull().unique(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const paymentStatusMaster = mysqlTable("payment_status_master", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar({ length: 80 }).notNull().unique(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const projectMaster = mysqlTable("project_master", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  code: varchar({ length: 40 }).notNull().unique(),
  name: varchar({ length: 180 }).notNull().unique(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const vendorMaster = mysqlTable("vendor_master", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar({ length: 180 }).notNull().unique(),
  contactPerson: varchar("contact_person", { length: 120 }),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 180 }),
  address: varchar({ length: 500 }),
  isActive: tinyint("is_active").notNull().default(1),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).references(
    () => users.id,
  ),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

export const insertParticularsSchema = createInsertSchema(particularsMaster).omit({ id: true, createdAt: true });
export const selectParticularsSchema = createSelectSchema(particularsMaster);
export type Particular = typeof particularsMaster.$inferSelect;

export const insertUomSchema = createInsertSchema(uomMaster).omit({ id: true, createdAt: true });
export const selectUomSchema = createSelectSchema(uomMaster);
export type Uom = typeof uomMaster.$inferSelect;

export const insertPaymentStatusSchema = createInsertSchema(paymentStatusMaster).omit({ id: true, createdAt: true });
export const selectPaymentStatusSchema = createSelectSchema(paymentStatusMaster);
export type PaymentStatus = typeof paymentStatusMaster.$inferSelect;

export const insertProjectSchema = createInsertSchema(projectMaster).omit({ id: true, createdAt: true });
export const selectProjectSchema = createSelectSchema(projectMaster);
export type Project = typeof projectMaster.$inferSelect;

export const insertVendorSchema = createInsertSchema(vendorMaster).omit({ id: true, createdAt: true, updatedAt: true });
export const selectVendorSchema = createSelectSchema(vendorMaster);
export type Vendor = typeof vendorMaster.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
