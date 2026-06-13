import { Router } from "express";
import * as catchupController from "./catchup.controller";

export const catchupRouter = Router();

catchupRouter.get("/", catchupController.getCatchUp);
catchupRouter.get("/context-stats", catchupController.getContextStats);
