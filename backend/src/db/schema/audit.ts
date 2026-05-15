import {
  mysqlTable,
  bigint,
  varchar,
  timestamp,
  json,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: bigint({ mode: "number", unsigned: true }).autoincrement().primaryKey(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: bigint("entity_id", { mode: "number", unsigned: true }).notNull(),
    action: varchar({ length: 80 }).notNull(),
    oldValue: json("old_value"),
    newValue: json("new_value"),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(
      () => users.id,
    ),
    timestamp: timestamp("timestamp")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_audit_entity").on(t.entityType, t.entityId)],
);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
