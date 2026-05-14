import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { db, documents, expenseVersions, expenses } from "@workspace/db";
import { eq, and, count, isNull } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR))
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${randomUUID()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        cb(null, allowed.includes(file.mimetype));
    },
});
const router = Router();
// ─── Helper: upload files to a specific version ──────────────────────────────
async function uploadToVersion(expenseId, versionId, files, userId) {
    const [version] = await db
        .select()
        .from(expenseVersions)
        .where(and(eq(expenseVersions.id, versionId), eq(expenseVersions.expenseId, expenseId)))
        .limit(1);
    if (!version)
        return null;
    const [countResult] = await db
        .select({ count: count() })
        .from(documents)
        .where(eq(documents.expenseVersionId, versionId));
    const startOrder = (countResult?.count ?? 0) + 1;
    const inserted = await Promise.all(files.map(async (file, i) => {
        const relativePath = path.relative(process.cwd(), file.path);
        const publicUrl = `/api/uploads/${file.filename}`;
        const [docInserted] = await db
            .insert(documents)
            .values({
            expenseVersionId: versionId,
            voucherNumber: version.voucherNumber,
            invoiceNumber: version.invoiceNumber ?? null,
            fileOrder: startOrder + i,
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            fileSize: file.size,
            relativePath,
            publicUrl,
            storageDriver: "local",
            uploadedBy: userId,
        })
            .$returningId();
        return {
            id: docInserted.id,
            originalName: file.originalname,
            publicUrl,
        };
    }));
    return inserted;
}
// ─── POST /expenses/:id/documents ────────────────────────────────────────────
// Convenience endpoint: upload to the expense's CURRENT version.
// This is the primary documented contract endpoint.
router.post("/expenses/:id/documents", requireRole("expense_entry"), upload.array("files", 10), async (req, res) => {
    const expenseId = Number(req.params.id);
    const userId = res.locals.user.id;
    const [expense] = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt)))
        .limit(1);
    if (!expense || expense.currentVersionId == null) {
        res.status(404).json({ error: "Expense not found" });
        return;
    }
    const files = req.files;
    if (!files?.length) {
        res.status(400).json({ error: "No files uploaded" });
        return;
    }
    const inserted = await uploadToVersion(expenseId, expense.currentVersionId, files, userId);
    if (!inserted) {
        res.status(404).json({ error: "Expense version not found" });
        return;
    }
    res.status(201).json({ data: inserted });
});
// ─── GET /expenses/:id/documents ─────────────────────────────────────────────
// List documents for the expense's current version.
router.get("/expenses/:id/documents", requireRole("expense_entry"), async (req, res) => {
    const expenseId = Number(req.params.id);
    const [expense] = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), isNull(expenses.deletedAt)))
        .limit(1);
    if (!expense || expense.currentVersionId == null) {
        res.status(404).json({ error: "Expense not found" });
        return;
    }
    const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.expenseVersionId, expense.currentVersionId))
        .orderBy(documents.fileOrder);
    res.json({ data: docs });
});
// ─── POST /expenses/:expenseId/versions/:versionId/documents ─────────────────
// Versioned upload endpoint (for targeting a specific historical version).
router.post("/expenses/:expenseId/versions/:versionId/documents", requireRole("expense_entry"), upload.array("files", 10), async (req, res) => {
    const expenseId = Number(req.params.expenseId);
    const versionId = Number(req.params.versionId);
    const userId = res.locals.user.id;
    const files = req.files;
    if (!files?.length) {
        res.status(400).json({ error: "No files uploaded" });
        return;
    }
    const inserted = await uploadToVersion(expenseId, versionId, files, userId);
    if (!inserted) {
        res.status(404).json({ error: "Version not found" });
        return;
    }
    res.status(201).json({ data: inserted });
});
// ─── GET /expenses/:expenseId/versions/:versionId/documents ──────────────────
router.get("/expenses/:expenseId/versions/:versionId/documents", requireRole("expense_entry"), async (req, res) => {
    const expenseId = Number(req.params.expenseId);
    const versionId = Number(req.params.versionId);
    const [version] = await db
        .select()
        .from(expenseVersions)
        .where(and(eq(expenseVersions.id, versionId), eq(expenseVersions.expenseId, expenseId)))
        .limit(1);
    if (!version) {
        res.status(404).json({ error: "Version not found" });
        return;
    }
    const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.expenseVersionId, versionId))
        .orderBy(documents.fileOrder);
    res.json({ data: docs });
});
export default router;
//# sourceMappingURL=documents.js.map