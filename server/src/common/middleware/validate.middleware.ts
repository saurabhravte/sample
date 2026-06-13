import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";

/**
 * Zod-as-middleware so no route can skip validation.
 * Parsed value replaces req.body / req.query — handlers only ever see typed data.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) as z.infer<T>;
    next();
  };
}
export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { parsedQuery: z.infer<T> }).parsedQuery = schema.parse(req.query);
    next();
  };
}
