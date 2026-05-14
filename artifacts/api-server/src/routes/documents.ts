import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { db, documents, expenseVersions } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireRole } from "../middlewares/auth";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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

router.post(
  "/expenses/:expenseId/versions/:versionId/documents",
  requireRole("expense_entry"),
  upload.array("files", 10),
  async (req, res) => {
    const expenseId = Number(req.params.expenseId);
    const versionId = Number(req.params.versionId);
    const userId = res.locals.user.id;

    const [version] = await db
      .select()
      .from(expenseVersions)
      .where(
        and(
          eq(expenseVersions.id, versionId),
          eq(expenseVersions.expenseId, expenseId),
        ),
      )
      .limit(1);
    if (!version) { res.status(404).json({ error: "Version not found" }); return; }

    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ error: "No files uploaded" }); return; }

    const [countResult] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.expenseVersionId, versionId));

    const startOrder = (countResult?.count ?? 0) + 1;

    const inserted = await Promise.all(
      files.map(async (file, i) => {
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
      }),
    );

    res.status(201).json({ data: inserted });
  },
);

router.get(
  "/expenses/:expenseId/versions/:versionId/documents",
  requireRole("expense_entry"),
  async (req, res) => {
    const expenseId = Number(req.params.expenseId);
    const versionId = Number(req.params.versionId);

    const [version] = await db
      .select()
      .from(expenseVersions)
      .where(
        and(
          eq(expenseVersions.id, versionId),
          eq(expenseVersions.expenseId, expenseId),
        ),
      )
      .limit(1);
    if (!version) { res.status(404).json({ error: "Version not found" }); return; }

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.expenseVersionId, versionId))
      .orderBy(documents.fileOrder);

    res.json({ data: docs });
  },
);

export default router;
