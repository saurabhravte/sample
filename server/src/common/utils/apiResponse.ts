import type { Response } from "express";

/**
 * Custom success envelope. Every successful response from the API has the
 * exact same shape:
 *   { success: true, statusCode, message, data }
 * Errors are produced by the error middleware as:
 *   { success: false, statusCode, message, error: { code, message } }
 */
export class ApiResponse<T> {
  public readonly success: boolean;

  constructor(
    public statusCode: number,
    public data: T,
    public message = "Success",
  ) {
    this.success = statusCode < 400;
  }
}

/** Shorthand used by every controller: sendResponse(res, 200, payload). */
export const sendResponse = <T>(res: Response, statusCode: number, data: T, message = "Success") =>
  res.status(statusCode).json(new ApiResponse(statusCode, data, message));
