import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/product.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loadStore } from "../middlewares/store.middleware";

const router = Router();

router.use(authMiddleware, loadStore);

router.post("/", createProduct);
router.get("/", listProducts);
router.get("/:id", getProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;