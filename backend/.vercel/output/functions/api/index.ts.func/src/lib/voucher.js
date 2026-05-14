import { pool } from "@workspace/db";
const SEQUENCE_ID = {
    payment: 1,
    receive: 2,
};
/**
 * Atomically increments the voucher sequence and returns the formatted number.
 * Uses a dedicated connection (not the shared pool) to guarantee LAST_INSERT_ID()
 * isolation, plus a FOR UPDATE row lock for concurrency safety.
 */
export async function nextVoucherNumber(type) {
    const seqId = SEQUENCE_ID[type];
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        // Lock the row for this transaction
        await conn.execute("SELECT id FROM voucher_sequence WHERE id = ? FOR UPDATE", [seqId]);
        // Increment
        await conn.execute("UPDATE voucher_sequence SET current_value = current_value + 1 WHERE id = ?", [seqId]);
        // Read back the new value on the same connection (no LAST_INSERT_ID needed)
        const [rows] = await conn.execute("SELECT current_value AS val, prefix FROM voucher_sequence WHERE id = ?", [seqId]);
        await conn.commit();
        const row = rows[0];
        if (!row)
            throw new Error("Voucher sequence row not found");
        const padded = String(Number(row.val)).padStart(5, "0");
        return `${row.prefix}-${padded}`;
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
//# sourceMappingURL=voucher.js.map