import { Router, type IRouter } from "express";
import healthRouter from "./health";
import measurementsRouter from "./measurements";
import pillsRouter from "./pills";
import settingsRouter from "./settings";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(measurementsRouter);
router.use(pillsRouter);
router.use(settingsRouter);
router.use(backupRouter);

export default router;
