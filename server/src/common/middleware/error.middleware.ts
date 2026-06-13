import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProd } from "../config/env";
import { ApiError } from "../utils/apiError";

/**
 * Central error middleware: detailed log server-side (IDs only, no payload
 * bodies), generic message to the client. Never leaks stack traces.
 * Error envelope: { success: false, statusCode, message, error: { code, message } }
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return res.status(422).json({
      success: false,
      statusCode: 422,
      message,
      error: { code: "VALIDATION", message },
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      error: { code: err.code, message: err.message },
      ...(err.errors.length ? { errors: err.errors } : {}),
    });
  }
  console.error(`[error] ${req.method} ${req.path}`, isProd ? (err as Error)?.message : err);
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: "Something went wrong",
    error: { code: "INTERNAL", message: "Something went wrong" },
  });
}
