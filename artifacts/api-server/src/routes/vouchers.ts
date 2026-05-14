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
} from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";
import { nextVoucherNumber } from "../lib/voucher";
import { writeAudit } from "../lib/audit";

const router = Router();

export async function getVoucherDetail(expenseId: number) {
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
    .innerJoin(expenseVersions, eq(expenseVersions.id, expenses.currentVersionId!))
    .innerJoin(projectMaster, eq(projectMaster.id, expenses.projectId))
    .innerJoin(vendorMaster, eq(vendorMaster.id, expenses.vendorId))
    .innerJoin(particularsMaster, eq(particularsMaster.id, expenseVersions.particularId))
    .innerJoin(uomMaster, eq(uomMaster.id, expenseVersions.uomId))
    .innerJoin(paymentStatusMaster, eq(paymentStatusMaster.id, expenseVersions.paymentStatusId))
    .where(eq(expenses.id, expenseId))
    .limit(1);

  return row ?? null;
}

interface CreateVoucherBody {
  projectId: number;
  vendorId: number;
  expenseDate: string;
  particularId: number;
  description?: string;
  transactionDetails?: string;
  uomId: number;
  quantity: number;
  pricePerUnit: number;
  invoiceNumber?: string;
  paymentStatusId: number;
}

async function createVoucher(
  voucherType: "payment" | "receive",
  body: CreateVoucherBody,
  userId: number,
) {
  const {
    projectId,
    vendorId,
    expenseDate,
    particularId,
    description,
    transactionDetails,
    uomId,
    quantity,
    pricePerUnit,
    invoiceNumber,
    paymentStatusId,
  } = body;

  const amount = (Number(quantity) * Number(pricePerUnit)).toFixed(2);
  const voucherNumber = await nextVoucherNumber(voucherType);

  let expenseId!: number;
  let versionId!: number;

  await db.transaction(async (tx) => {
    const [expInserted] = await tx
      .insert(expenses)
      .values({
        projectId: Number(projectId),
        vendorId: Number(vendorId),
        voucherType,
        createdBy: userId,
      })
      .$returningId();
    expenseId = expInserted.id;

    const [verInserted] = await tx
      .insert(expenseVersions)
      .values({
        expenseId,
        versionNo: 1,
        voucherNumber,
        expenseDate,
        particularId: Number(particularId),
        description: description ?? null,
        transactionDetails: transactionDetails ?? null,
        uomId: Number(uomId),
        quantity: String(quantity),
        pricePerUnit: String(pricePerUnit),
        amount,
        invoiceNumber: invoiceNumber ?? null,
        paymentStatusId: Number(paymentStatusId),
        createdBy: userId,
      })
      .$returningId();
    versionId = verInserted.id;

    await tx
      .update(expenses)
      .set({ currentVersionId: versionId })
      .where(eq(expenses.id, expenseId));
  });

  return { expenseId, versionId, voucherNumber };
}

const REQUIRED_VOUCHER_FIELDS = [
  "projectId",
  "vendorId",
  "expenseDate",
  "particularId",
  "uomId",
  "quantity",
  "pricePerUnit",
  "paymentStatusId",
] as const;

router.post("/vouchers/payment", requireRole("expense_entry"), async (req, res) => {
  const body = req.body as Partial<CreateVoucherBody>;
  const missing = REQUIRED_VOUCHER_FIELDS.filter((k) => body[k] == null);
  if (missing.length) {
    res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
    return;
  }

  const result = await createVoucher("payment", body as CreateVoucherBody, res.locals.user.id);
  await writeAudit({
    entityType: "expense",
    entityId: result.expenseId,
    action: "create_payment_voucher",
    newValue: req.body,
    userId: res.locals.user.id,
  });
  const detail = await getVoucherDetail(result.expenseId);
  res.status(201).json({ data: detail });
});

router.post("/vouchers/receive", requireRole("expense_entry"), async (req, res) => {
  const body = req.body as Partial<CreateVoucherBody>;
  const missing = REQUIRED_VOUCHER_FIELDS.filter((k) => body[k] == null);
  if (missing.length) {
    res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
    return;
  }

  const result = await createVoucher("receive", body as CreateVoucherBody, res.locals.user.id);
  await writeAudit({
    entityType: "expense",
    entityId: result.expenseId,
    action: "create_receive_voucher",
    newValue: req.body,
    userId: res.locals.user.id,
  });
  const detail = await getVoucherDetail(result.expenseId);
  res.status(201).json({ data: detail });
});

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

  await writeAudit({
    entityType: "expense",
    entityId: expenseId,
    action: "approve",
    userId,
  });

  const detail = await getVoucherDetail(expenseId);
  res.json({ data: detail });
});

export default router;
