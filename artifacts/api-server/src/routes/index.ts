import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import eventsRouter from "./events.js";
import usersRouter from "./users.js";
import statsRouter from "./stats.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(usersRouter);
router.use(statsRouter);

export default router;
