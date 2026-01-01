import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
export const adminRouter = Router();
adminRouter.use(requireAdmin);
