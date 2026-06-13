import { Router } from "express";
import * as pricingController from "./pricing.controller";

export const pricingRouter = Router();
pricingRouter.get("/", pricingController.getPricing);
