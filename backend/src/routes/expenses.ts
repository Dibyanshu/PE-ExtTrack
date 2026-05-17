import { Router } from "express";
import type { SQL } from "drizzle-orm";
import {
  db,
  pool,
  expenses,
  expenseVersions,
  particularsMaster,
  uomMaster,
  paymentStatusMaster,
  projectMaster,
  vendorMaster,
  documents,
} from "../db";
import { eq, and, gte, lte, like, desc, sql, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";
import { getVoucherDetail } from "./vouchers";

const router = Router();

router.get("/expenses", requireAuth, async (req, res) => {
  const user = res.locals.user as { role: string; projectId: number };
  const {
    from, to, projectId, particularId, paymentStatusId,
    vendorId, voucherType, voucherNumber,
    page = "1", limit = "20",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: SQL<unknown>[] = [isNull(expenses.deletedAt)];
  if (user.role === "expense_entry") {
    conditions.push(eq(expenses.projectId, Number(user.projectId)));
  }
  if (from) conditions.push(gte(expenseVersions.expenseDate, from));
  if (to) conditions.push(lte(expenseVersions.expenseDate, to));
  if (projectId) conditions.push(eq(expenses.projectId, Number(projectId)));
  if (particularId) conditions.push(eq(expenseVersions.particularId, Number(particularId)));
  if (paymentStatusId) conditions.push(eq(expenseVersions.paymentStatusId, Number(paymentStatusId)));
  if (vendorId) conditions.push(eq(expenses.vendorId, Number(vendorId)));
  if (voucherType === "payment" || voucherType === "receive") {
    conditions.push(eq(expenses.voucherType, voucherType));
  }
  if (voucherNumber) conditions.push(like(expenseVersions.voucherNumber, `%${voucherNumber}%`));

  const whereClause = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        expenseId: expenses.id,
        voucherType: expenses.voucherType,
        projectName: projectMaster.name,
        vendorName: vendorMaster.name,
        voucherNumber: expenseVersions.voucherNumber,
        expenseDate: expenseVersions.expenseDate,
        particularName: particularsMaster.name,
        uomName: uomMaster.name,
        quantity: expenseVersions.quantity,
        pricePerUnit: expenseVersions.pricePerUnit,
        amount: expenseVersions.amount,
        invoiceNumber: expenseVersions.invoiceNumber,
        paymentStatusName: paymentStatusMaster.name,
        paymentStatusId: expenseVersions.paymentStatusId,
        versionId: expenseVersions.id,
        versionNo: expenseVersions.versionNo,
        approvedAt: expenses.approvedAt,
        finalizedAt: expenses.finalizedAt,
      })
      .from(expenses)
      .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId!))
      .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
      .innerJoin(vendorMaster, eq(vendorMaster.id, expenses.vendorId))
      .innerJoin(particularsMaster, eq(particularsMaster.id, expenseVersions.particularId))
      .innerJoin(uomMaster, eq(uomMaster.id, expenseVersions.uomId))
      .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
      .where(whereClause)
      .orderBy(desc(expenseVersions.expenseDate))
      .limit(limitNum)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId!))
      .where(whereClause),
  ]);

  res.json({ data: rows, total: countResult[0]?.count ?? 0, page: pageNum, limit: limitNum });
});

router.get("/expenses/:id", requireAuth, async (req, res) => {
  const user = res.locals.user as { role: string; projectId: number };
  const expenseId = Number(req.params.id);

  const [exp] = await db
    .select({ deletedAt: expenses.deletedAt, projectId: expenses.projectId })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);
  if (!exp || exp.deletedAt !== null) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  if (user.role === "expense_entry" && exp.projectId !== Number(user.projectId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const detail = await getVoucherDetail(expenseId);
  if (!detail) { res.status(404).json({ error: "Expense not found" }); return; }

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.expenseVersionId, detail.versionId))
    .orderBy(documents.fileOrder);

  res.json({ data: { ...detail, documents: docs } });
});

router.put("/expenses/:id", requireRole("expense_entry"), async (req, res) => {
  const expenseId = Number(req.params.id);
  const userId = res.locals.user.id;
  const user = res.locals.user as { role: string; projectId: number };

  const [existing] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Expense not found" }); return; }

  if (user.role === "expense_entry" && existing.projectId !== Number(user.projectId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (existing.approvedAt !== null) {
    res.status(409).json({ error: "Cannot edit an already-approved expense" });
    return;
  }
  if (existing.finalizedAt !== null) {
    res.status(409).json({ error: "Cannot edit a finalized expense" });
    return;
  }

  const [lastVersion] = await db
    .select({ versionNo: expenseVersions.versionNo })
    .from(expenseVersions)
    .where(eq(expenseVersions.expenseId, expenseId))
    .orderBy(desc(expenseVersions.versionNo))
    .limit(1);

  const nextVersionNo = (lastVersion?.versionNo ?? 0) + 1;

  const [prevVersion] = await db
    .select()
    .from(expenseVersions)
    .where(eq(expenseVersions.id, existing.currentVersionId!))
    .limit(1);

  const {
    expenseDate, particularId, description, transactionDetails,
    uomId, quantity, pricePerUnit, invoiceNumber, paymentStatusId,
  } = req.body as {
    expenseDate?: string; particularId?: number; description?: string;
    transactionDetails?: string; uomId?: number; quantity?: number;
    pricePerUnit?: number; invoiceNumber?: string; paymentStatusId?: number;
  };

  const qty = quantity ?? prevVersion?.quantity;
  const ppu = pricePerUnit ?? prevVersion?.pricePerUnit;
  const amount = (Number(qty) * Number(ppu)).toFixed(2);

  // Use a dedicated connection to avoid LAST_INSERT_ID contamination
  const conn = await pool.getConnection();
  let newVersionId: number;
  try {
    await conn.beginTransaction();
    const [verResult] = await conn.execute(
      `INSERT INTO expense_versions
         (expense_id, version_no, voucher_number, expense_date, particular_id,
          description, transaction_details, uom_id, quantity, price_per_unit,
          amount, invoice_number, payment_status_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId, nextVersionNo, prevVersion!.voucherNumber,
        expenseDate ?? prevVersion!.expenseDate,
        particularId != null ? Number(particularId) : prevVersion!.particularId,
        description ?? prevVersion?.description ?? null,
        transactionDetails ?? prevVersion?.transactionDetails ?? null,
        uomId != null ? Number(uomId) : prevVersion!.uomId,
        String(qty), String(ppu), amount,
        invoiceNumber ?? prevVersion?.invoiceNumber ?? null,
        paymentStatusId != null ? Number(paymentStatusId) : prevVersion!.paymentStatusId,
        userId,
      ],
    ) as [{ insertId: number }, unknown];
    newVersionId = verResult.insertId;

    await conn.execute(
      "UPDATE expenses SET current_version_id = ? WHERE id = ?",
      [newVersionId, expenseId],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await writeAudit({
    entityType: "expense", entityId: expenseId,
    action: "update", oldValue: prevVersion, newValue: req.body, userId,
  });
  const detail = await getVoucherDetail(expenseId);
  res.json({ data: detail });
});

// Soft-delete — admin+ only
router.delete("/expenses/:id", requireRole("admin"), async (req, res) => {
  const expenseId = Number(req.params.id);

  const [existing] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt)))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Expense not found" }); return; }

  await writeAudit({
    entityType: "expense", entityId: expenseId,
    action: "delete", oldValue: existing, userId: res.locals.user.id,
  });

  await db.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, expenseId));
  res.json({ success: true });
});

// Approve — accounts+ only. Once approved, editing is blocked.
router.patch("/expenses/:id/approve", requireRole("accounts"), async (req, res) => {
  const expenseId = Number(req.params.id);
  const userId = res.locals.user.id;

  const [existing] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!existing || existing.deletedAt !== null) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  if (existing.approvedAt !== null) {
    res.status(409).json({ error: "Expense is already approved" });
    return;
  }

  await db
    .update(expenses)
    .set({ approvedBy: userId, approvedAt: new Date() })
    .where(eq(expenses.id, expenseId));

  await writeAudit({ entityType: "expense", entityId: expenseId, action: "approve", userId });

  const detail = await getVoucherDetail(expenseId);
  res.json({ data: detail });
});

// Finalize — accounts+ only. Locks the expense permanently after approval.
// A finalized expense cannot be edited or re-finalized.
router.patch("/expenses/:id/finalize", requireRole("accounts"), async (req, res) => {
  const expenseId = Number(req.params.id);
  const userId = res.locals.user.id;

  const [existing] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!existing || existing.deletedAt !== null) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  if (existing.approvedAt === null) {
    res.status(409).json({ error: "Expense must be approved before it can be finalized" });
    return;
  }
  if (existing.finalizedAt !== null) {
    res.status(409).json({ error: "Expense is already finalized" });
    return;
  }

  await db
    .update(expenses)
    .set({ finalizedAt: new Date(), finalizedBy: userId })
    .where(eq(expenses.id, expenseId));

  await writeAudit({ entityType: "expense", entityId: expenseId, action: "finalize", userId });

  const detail = await getVoucherDetail(expenseId);
  res.json({ data: detail });
});

router.get("/expenses/:id/history", requireAuth, async (req, res) => {
  const user = res.locals.user;
  if (!user.canViewHistory) {
    res.status(403).json({ error: "History access not permitted" });
    return;
  }

  const expenseId = Number(req.params.id);
  const [exp] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt)))
    .limit(1);
  if (!exp) { res.status(404).json({ error: "Expense not found" }); return; }
  if (user.role === "expense_entry" && exp.projectId !== Number(user.projectId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const versions = await db
    .select({
      id: expenseVersions.id,
      versionNo: expenseVersions.versionNo,
      voucherNumber: expenseVersions.voucherNumber,
      expenseDate: expenseVersions.expenseDate,
      particularName: particularsMaster.name,
      uomName: uomMaster.name,
      quantity: expenseVersions.quantity,
      pricePerUnit: expenseVersions.pricePerUnit,
      amount: expenseVersions.amount,
      invoiceNumber: expenseVersions.invoiceNumber,
      paymentStatusName: paymentStatusMaster.name,
      description: expenseVersions.description,
      createdAt: expenseVersions.createdAt,
    })
    .from(expenseVersions)
    .innerJoin(particularsMaster, eq(particularsMaster.id, expenseVersions.particularId))
    .innerJoin(uomMaster, eq(uomMaster.id, expenseVersions.uomId))
    .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
    .where(eq(expenseVersions.expenseId, expenseId))
    .orderBy(expenseVersions.versionNo);

  res.json({ data: versions });
});

export default router;
