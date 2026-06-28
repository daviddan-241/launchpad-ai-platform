import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import campaignsRouter from "./campaigns";
import chatRouter from "./chat";
import settingsRouter from "./settings";
import analyticsRouter from "./analytics";
import emailsRouter from "./emails";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/leads", leadsRouter);
router.use("/campaigns", campaignsRouter);
router.use("/chat", chatRouter);
router.use("/settings", settingsRouter);
router.use("/analytics", analyticsRouter);
router.use("/emails", emailsRouter);

export default router;
