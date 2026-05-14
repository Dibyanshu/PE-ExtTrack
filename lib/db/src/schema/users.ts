import {
  mysqlTable,
  bigint,
  varchar,
  tinyint,
  timestamp,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = mysqlTable("users", {
  id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar({ length: 120 }).notNull(),
  email: varchar({ length: 180 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum(["expense_entry", "accounts", "admin", "superadmin"])
    .notNull()
    .default("expense_entry"),
  canViewHistory: tinyint("can_view_history").notNull().default(0),
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
