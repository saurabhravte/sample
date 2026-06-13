import { Router } from "express";
import { CreateEventRequest } from "./dto/calendar.dto";
import { validateBody } from "../../common/middleware/validate.middleware";
import * as calendarController from "./calendar.controller";

export const calendarRouter = Router();

calendarRouter.get("/events", calendarController.listEvents);
calendarRouter.post("/events", validateBody(CreateEventRequest), calendarController.createEvent);
calendarRouter.get("/events/:eventId/brief", calendarController.eventBrief);
calendarRouter.get("/availability", calendarController.availability);
