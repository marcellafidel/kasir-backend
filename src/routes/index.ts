import { Router } from "express";

import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import categoryRoutes from "./category.routes";
import productRoutes from "./product.routes";
import orderRoutes from "./order.routes";
import expenseCategoryRoutes from "./expense-category.routes";
import expenseRoutes from "./expense.routes";
import reportRoutes from "./report.routes";
import storeRoutes from "./store.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/expense-categories", expenseCategoryRoutes);
router.use("/expenses", expenseRoutes);
router.use("/reports", reportRoutes);
router.use("/store", storeRoutes);

export default router;