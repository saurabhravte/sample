import { Router } from "express";
import { CommandRequest } from "./dto/command.dto";
import { validateBody } from "../../common/middleware/validate.middleware";
import { aiLimiter } from "../../common/middleware/rateLimit.middleware";
import * as commandController from "./command.controller";

export const commandRouter = Router();

commandRouter.post("/", aiLimiter, validateBody(CommandRequest), commandController.run);
commandRouter.get("/actions", commandController.listActions);
commandRouter.post("/actions/:id/:decision", commandController.decide);
