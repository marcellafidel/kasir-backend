import { Router } from "express";
import {
  createOrder,
  getOrderDetail,
  getOrderHistory,
} from "../controllers/order.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loadStore } from "../middlewares/store.middleware";

const router = Router();

router.use(authMiddleware, loadStore);

router.post("/", createOrder);
router.get("/", getOrderHistory);
router.get("/:idOrNumber", getOrderDetail);

export default router;