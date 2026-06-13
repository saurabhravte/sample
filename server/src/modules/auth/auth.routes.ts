import { Router } from "express";
import { LoginRequest, RegisterRequest } from "./dto/auth.dto";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authLimiter } from "../../common/middleware/rateLimit.middleware";
import { requireAuth } from "./auth.middleware";
import * as authController from "./auth.controller";

export const authRouter = Router();

/* Email + password */
authRouter.post("/register", authLimiter, validateBody(RegisterRequest), authController.register);
authRouter.post("/login", authLimiter, validateBody(LoginRequest), authController.login);

/* Google OAuth (identity only — integrations are connected separately) */
authRouter.get("/google", authController.googleStart);
authRouter.get("/google/callback", authController.googleCallback);

authRouter.post("/logout", requireAuth, authController.logout);
authRouter.get("/me", requireAuth, authController.me);
