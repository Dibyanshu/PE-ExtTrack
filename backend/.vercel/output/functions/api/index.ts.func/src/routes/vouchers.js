import { Router } from "express";
import { db, pool, expenses, expenseVersions, particularsMaster, uomMaster, paymentStatusMaster, projectMaster, vendorMaster, } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";
import { nextVoucherNumber } from "../lib/voucher";
import { writeAudit } from "../lib/audit";
const router = Router();
export async function getVoucherDetail(expenseId) {
    const [row] = await db
        .select({
        expenseId: expenses.id,
        voucherType: expenses.voucherType,
        projectId: expenses.projectId,
        projectName: projectMaster.name,
        vendorId: expenses.vendorId,
        vendorName: vendorMaster.name,
        createdBy: expenses.createdBy,
        approvedBy: expenses.approvedBy,
        approvedAt: expenses.approvedAt,
        finalizedBy: expenses.finalizedBy,
        finalizedAt: expenses.finalizedAt,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        versionId: expenseVersions.id,
        versionNo: expenseVersions.versionNo,
        voucherNumber: expenseVersions.voucherNumber,
        expenseDate: expenseVersions.expenseDate,
        particularId: expenseVersions.particularId,
        particularName: particularsMaster.name,
        description: expenseVersions.description,
        transactionDetails: expenseVersions.transactionDetails,
        uomId: expenseVersions.uomId,
        uomName: uomMaster.name,
        quantity: expenseVersions.quantity,
        pricePerUnit: expenseVersions.pricePerUnit,
        amount: expenseVersions.amount,
        invoiceNumber: expenseVersions.invoiceNumber,
        paymentStatusId: expenseVersions.paymentStatusId,
        paymentStatusName: paymentStatusMaster.name,
    })
        .from(expenses)
        .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId))
        .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
        .innerJoin(vendorMaster, eq(vendorMaster.id, expenses.vendorId))
        .innerJoin(particularsMaster, eq(particularsMaster.id, expenseVersions.particularId))
        .innerJoin(uomMaster, eq(uomMaster.id, expenseVersions.uomId))
        .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
        .where(eq(expenses.id, expenseId))
        .limit(1);
    return row ?? null;
}
/**
 * Creates a new voucher (expense + first version) using a dedicated DB connection
 * so LAST_INSERT_ID() is never contaminated by other queries on the same connection.
 */
async function createVoucher(voucherType, body, userId) {
    const { projectId, vendorId, expenseDate, particularId, description, transactionDetails, uomId, quantity, pricePerUnit, invoiceNumber, paymentStatusId, } = body;
    const amount = (Number(quantity) * Number(pricePerUnit)).toFixed(2);
    const voucherNumber = await nextVoucherNumber(voucherType);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [expResult] = await conn.execute(`INSERT INTO expenses (project_id, vendor_id, voucher_type, created_by)
       VALUES (?, ?, ?, ?)`, [Number(projectId), Number(vendorId), voucherType, userId]);
        const expenseId = expResult.insertId;
        const [verResult] = await conn.execute(`INSERT INTO expense_versions
         (expense_id, version_no, voucher_number, expense_date, particular_id,
          description, transaction_details, uom_id, quantity, price_per_unit,
          amount, invoice_number, payment_status_id, created_by)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            expenseId, voucherNumber, expenseDate,
            Number(particularId),
            description ?? null,
            transactionDetails ?? null,
            Number(uomId),
            String(quantity), String(pricePerUnit), amount,
            invoiceNumber ?? null,
            Number(paymentStatusId), userId,
        ]);
        const versionId = verResult.insertId;
        await conn.execute("UPDATE expenses SET current_version_id = ? WHERE id = ?", [versionId, expenseId]);
        await conn.commit();
        return { expenseId, versionId, voucherNumber };
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
const REQUIRED_VOUCHER_FIELDS = [
    "projectId", "vendorId", "expenseDate", "particularId",
    "uomId", "quantity", "pricePerUnit", "paymentStatusId",
];
router.post("/vouchers/payment", requireRole("expense_entry"), async (req, res) => {
    const body = req.body;
    const missing = REQUIRED_VOUCHER_FIELDS.filter((k) => body[k] == null);
    if (missing.length) {
        res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
        return;
    }
    const result = await createVoucher("payment", body, res.locals.user.id);
    await writeAudit({
        entityType: "expense", entityId: result.expenseId,
        action: "create_payment_voucher", newValue: req.body, userId: res.locals.user.id,
    });
    const detail = await getVoucherDetail(result.expenseId);
    res.status(201).json({ data: detail });
});
router.post("/vouchers/receive", requireRole("expense_entry"), async (req, res) => {
    const body = req.body;
    const missing = REQUIRED_VOUCHER_FIELDS.filter((k) => body[k] == null);
    if (missing.length) {
        res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
        return;
    }
    const result = await createVoucher("receive", body, res.locals.user.id);
    await writeAudit({
        entityType: "expense", entityId: result.expenseId,
        action: "create_receive_voucher", newValue: req.body, userId: res.locals.user.id,
    });
    const detail = await getVoucherDetail(result.expenseId);
    res.status(201).json({ data: detail });
});
export default router;
//# sourceMappingURL=vouchers.js.map