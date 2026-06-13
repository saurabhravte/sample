import { Router } from "express";
import { validateBody } from "../../common/middleware/validate.middleware";
import { ConnectDto } from "./dto/connections.dto";
import * as connectionsController from "./connections.controller";

export const connectionsRouter = Router();

connectionsRouter.get("/", connectionsController.listConnections);
connectionsRouter.post("/:provider/connect", validateBody(ConnectDto), connectionsController.connectProvider);
connectionsRouter.get("/callback", connectionsController.oauthCallback);
connectionsRouter.post("/:provider/disconnect", connectionsController.disconnectProvider);
