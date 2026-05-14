import { Router } from "express";
import {
  db,
  expenses,
  expenseVersions,
  particularsMaster,
  uomMaster,
  paymentStatusMaster,
  projectMaster,
  vendorMaster,
  documents,
  auditLogs,
} from "@workspace/db";
import { eq, and, gte, lte, like, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { writeAudit } from "../lib/audit";
import { getVoucherDetail } from "./vouchers";

const router = Router();

router.get("/expenses", requireAuth, async (req, res) => {
  const {
    from,
    to,
    projectId,
    particularId,
    paymentStatusId,
    vendorId,
    voucherType,
    voucherNumber,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (from) conditions.push(gte(expenseVersions.expenseDate, new Date(from)));
  if (to) conditions.push(lte(expenseVersions.expenseDate, new Date(to)));
  if (projectId) conditions.push(eq(expenses.projectId, Number(projectId)));
  if (particularId) conditions.push(eq(expenseVersions.particularId, Number(particularId)));
  if (paymentStatusId) conditions.push(eq(expenseVersions.paymentStatusId, Number(paymentStatusId)));
  if (vendorId) conditions.push(eq(expenses.vendorId, Number(vendorId)));
  if (voucherType === "payment" || voucherType === "receive") conditions.push(eq(expenses.voucherType, voucherType));
  if (voucherNumber) conditions.push(like(expenseVersions.voucherNumber, `%${voucherNumber}%`));

  const whereClause = conditions.length ? and(...conditions) : undefined;

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
  const expenseId = Number(req.params.id);
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

  const [existing] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);
  if (!existing) { res.status(404).json({ error: "Expense not found" }); return; }

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
    expenseDate,
    particularId,
    description,
    transactionDetails,
    uomId,
    quantity,
    pricePerUnit,
    invoiceNumber,
    paymentStatusId,
  } = req.body;

  const qty = quantity ?? prevVersion?.quantity;
  const ppu = pricePerUnit ?? prevVersion?.pricePerUnit;
  const amount = (Number(qty) * Number(ppu)).toFixed(2);

  let newVersionId!: number;

  await db.transaction(async (tx) => {
    const [verResult] = await tx.insert(expenseVersions).values({
      expenseId,
      versionNo: nextVersionNo,
      voucherNumber: prevVersion!.voucherNumber,
      expenseDate: expenseDate ?? prevVersion!.expenseDate,
      particularId: particularId != null ? Number(particularId) : prevVersion!.particularId,
      description: description ?? prevVersion?.description,
      transactionDetails: transactionDetails ?? prevVersion?.transactionDetails,
      uomId: uomId != null ? Number(uomId) : prevVersion!.uomId,
      quantity: String(qty),
      pricePerUnit: String(ppu),
      amount,
      invoiceNumber: invoiceNumber ?? prevVersion?.invoiceNumber,
      paymentStatusId: paymentStatusId != null ? Number(paymentStatusId) : prevVersion!.paymentStatusId,
      createdBy: userId,
    });
    newVersionId = Number((verResult as any).insertId);

    await tx.update(expenses).set({ currentVersionId: newVersionId }).where(eq(expenses.id, expenseId));
  });

  await writeAudit({ entityType: "expense", entityId: expenseId, action: "update", oldValue: prevVersion, newValue: req.body, userId });
  const detail = await getVoucherDetail(expenseId);
  res.json({ data: detail });
});

router.delete("/expenses/:id", requireRole("admin"), async (req, res) => {
  const expenseId = Number(req.params.id);
  const [existing] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Expense not found" }); return; }

  await writeAudit({ entityType: "expense", entityId: expenseId, action: "delete", oldValue: existing, userId: res.locals.user.id });

  await db.transaction(async (tx) => {
    await tx.update(expenses).set({ currentVersionId: null }).where(eq(expenses.id, expenseId));
    await tx.delete(expenseVersions).where(eq(expenseVersions.expenseId, expenseId));
    await tx.delete(expenses).where(eq(expenses.id, expenseId));
  });

  res.json({ success: true });
});

router.get("/expenses/:id/history", requireAuth, async (req, res) => {
  const user = res.locals.user;
  if (!user.canViewHistory) { res.status(403).json({ error: "History access not permitted" }); return; }

  const expenseId = Number(req.params.id);
  const [exp] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!exp) { res.status(404).json({ error: "Expense not found" }); return; }

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
