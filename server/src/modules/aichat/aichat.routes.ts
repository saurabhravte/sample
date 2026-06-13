import { Router } from "express";
import { validateBody } from "../../common/middleware/validate.middleware";
import { ChatDto } from "./dto/aichat.dto";
import * as aichatController from "./aichat.controller";

export const aichatRouter = Router();
aichatRouter.post("/", validateBody(ChatDto), aichatController.chat);
