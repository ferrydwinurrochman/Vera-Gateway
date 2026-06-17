import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import merchantsRouter from "./merchants";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/transactions", transactionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", usersRouter);
router.use("/merchants", merchantsRouter);
router.use("/settings", settingsRouter);

export default router;
