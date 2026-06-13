import { Router } from "express";
import { validateBody } from "../../common/middleware/validate.middleware";
import { CreateTaskDto, UpdateTaskDto } from "./dto/tasks.dto";
import * as tasksController from "./tasks.controller";

export const tasksRouter = Router();

tasksRouter.get("/", tasksController.listTasks);
tasksRouter.post("/", validateBody(CreateTaskDto), tasksController.createTask);
tasksRouter.get("/stats", tasksController.taskStats);
tasksRouter.get("/activity", tasksController.activity);
tasksRouter.patch("/:id", validateBody(UpdateTaskDto), tasksController.updateTask);
