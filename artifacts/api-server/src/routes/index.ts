import { Router, type IRouter, static as serveStatic } from "express";
import path from "path";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import mastersRouter from "./masters";
import vendorsRouter from "./vendors";
import vouchersRouter from "./vouchers";
import expensesRouter from "./expenses";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(mastersRouter);
router.use(vendorsRouter);
router.use(vouchersRouter);
router.use(expensesRouter);
router.use(documentsRouter);
router.use(dashboardRouter);

router.use("/uploads", serveStatic(path.resolve(process.cwd(), "uploads")));

export default router;
