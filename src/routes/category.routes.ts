import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../controllers/category.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loadStore } from "../middlewares/store.middleware";

const router = Router();

router.use(authMiddleware, loadStore);

router.post("/", createCategory);
router.get("/", listCategories);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;