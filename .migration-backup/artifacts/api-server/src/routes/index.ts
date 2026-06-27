import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import leadsRouter from "./leads";
import chatRouter from "./chat";
import campaignsRouter from "./campaigns";
import projectsRouter from "./projects";
import settingsRouter from "./settings";
import agentRouter from "./agent";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(leadsRouter);
router.use(chatRouter);
router.use(campaignsRouter);
router.use(projectsRouter);
router.use(settingsRouter);
router.use(agentRouter);
router.use(pushRouter);

export default router;
