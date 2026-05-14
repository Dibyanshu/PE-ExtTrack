import { db } from "@workspace/db";
import { voucherSequence } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

export type VoucherType = "payment" | "receive";

const SEQUENCE_ID: Record<VoucherType, number> = {
  payment: 1,
  receive: 2,
};

interface VoucherSequenceRow {
  val: string | number;
  prefix: string;
}

/**
 * Atomically increments the voucher sequence and returns the next number.
 * Uses a DB transaction + LAST_INSERT_ID() trick so concurrent callers
 * always get unique, sequential voucher numbers.
 */
export async function nextVoucherNumber(type: VoucherType): Promise<string> {
  const seqId = SEQUENCE_ID[type];

  return db.transaction(async (tx) => {
    // Lock the sequence row for the duration of this transaction
    await tx.execute(
      sql`SELECT id FROM voucher_sequence WHERE id = ${seqId} FOR UPDATE`,
    );

    // Increment using LAST_INSERT_ID so the new value is stored per-connection
    await tx.execute(
      sql`UPDATE voucher_sequence
          SET current_value = LAST_INSERT_ID(current_value + 1)
          WHERE id = ${seqId}`,
    );

    // LAST_INSERT_ID() is connection-scoped — safe under concurrency
    const result = await tx.execute(
      sql`SELECT LAST_INSERT_ID() AS val,
                 prefix
            FROM voucher_sequence
           WHERE id = ${seqId}`,
    );

    // drizzle mysql2 execute returns [rows, fields] — rows is RowDataPacket[]
    const rows = result as unknown as [VoucherSequenceRow[], unknown];
    const row = rows[0][0];
    if (!row) throw new Error("Voucher sequence row not found");

    const padded = String(Number(row.val)).padStart(5, "0");
    return `${row.prefix}-${padded}`;
  });
}
