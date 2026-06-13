import { Router } from "express";
import { SearchRequest } from "./dto/search.dto";
import { validateBody } from "../../common/middleware/validate.middleware";
import * as searchController from "./search.controller";

export const searchRouter = Router();

searchRouter.post("/", validateBody(SearchRequest), searchController.search);
