import {
  mysqlTable,
  tinyint,
  varchar,
  bigint,
  timestamp,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";

export const voucherSequence = mysqlTable("voucher_sequence", {
  id: tinyint({ unsigned: true }).primaryKey(),
  prefix: varchar({ length: 16 }).notNull(),
  currentValue: bigint("current_value", { mode: "number", unsigned: true })
    .notNull()
    .default(0),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

export const selectVoucherSequenceSchema = createSelectSchema(voucherSequence);
export type VoucherSequence = typeof voucherSequence.$inferSelect;
