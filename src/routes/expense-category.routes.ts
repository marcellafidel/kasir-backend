
import { Router } from "express";
import {
  createExpenseCategory,
  deactivateExpenseCategory,
  listExpenseCategories,
  updateExpenseCategory,
} from "../controllers/expense-category.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loadStore } from "../middlewares/store.middleware";

const router = Router();

router.use(authMiddleware, loadStore);

router.post("/", createExpenseCategory);
router.get("/", listExpenseCategories);
router.put("/:id", updateExpenseCategory);
router.delete("/:id", deactivateExpenseCategory);

export default router;
