import { db } from "@workspace/db";
import { voucherSequence } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export type VoucherType = "payment" | "receive";

const SEQUENCE_ID: Record<VoucherType, number> = {
  payment: 1,
  receive: 2,
};

export async function nextVoucherNumber(type: VoucherType): Promise<string> {
  const seqId = SEQUENCE_ID[type];

  await db
    .update(voucherSequence)
    .set({ currentValue: sql`${voucherSequence.currentValue} + 1` })
    .where(eq(voucherSequence.id, seqId));

  const [row] = await db
    .select()
    .from(voucherSequence)
    .where(eq(voucherSequence.id, seqId))
    .limit(1);

  if (!row) throw new Error("Voucher sequence not found");

  const padded = String(row.currentValue).padStart(5, "0");
  return `${row.prefix}-${padded}`;
}
