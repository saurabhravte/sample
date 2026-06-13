import { Router } from "express";
import * as summaryController from "./summary.controller";

export const summaryRouter = Router();
summaryRouter.get("/", summaryController.getSummary);
