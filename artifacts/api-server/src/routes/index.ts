import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import leadsRouter from "./leads";
import chatRouter from "./chat";
import campaignsRouter from "./campaigns";
import projectsRouter from "./projects";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(leadsRouter);
router.use(chatRouter);
router.use(campaignsRouter);
router.use(projectsRouter);
router.use(settingsRouter);

export default router;
