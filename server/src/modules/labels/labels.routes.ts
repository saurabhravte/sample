import { Router } from "express";
import { validateBody } from "../../common/middleware/validate.middleware";
import { CreateLabelDto } from "./dto/labels.dto";
import * as labelsController from "./labels.controller";

export const labelsRouter = Router();

labelsRouter.get("/", labelsController.listLabels);
labelsRouter.post("/", validateBody(CreateLabelDto), labelsController.createLabel);
labelsRouter.delete("/:id", labelsController.deleteLabel);
