import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async controller so any rejection is forwarded to the central
 * error middleware — controllers never need their own try/catch.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
