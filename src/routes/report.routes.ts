import { Router } from "express";
import { getFinancialReport } from "../controllers/report.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loadStore } from "../middlewares/store.middleware";

const router = Router();

router.use(authMiddleware, loadStore);

router.get("/financial", getFinancialReport);

export default router;