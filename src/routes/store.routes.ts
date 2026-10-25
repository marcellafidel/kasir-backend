
import { Router } from "express";
import { updateStoreProfile } from "../controllers/store.controller";
import { updateStoreLogo } from "../controllers/store-logo.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loadStore } from "../middlewares/store.middleware";
import { uploadLogo } from "../middlewares/upload.middleware";

const router = Router();

router.use(authMiddleware, loadStore);

router.patch("/profile", updateStoreProfile);
router.post("/logo", uploadLogo, updateStoreLogo);

export default router;
