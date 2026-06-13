/**
 * Custom application error. Every error thrown anywhere in the server should
 * be (or be wrapped into) an ApiError so the central error middleware can
 * produce a consistent, non-leaky JSON envelope.
 */
export class ApiError extends Error {
  public readonly success = false as const;

  constructor(
    public statusCode: number,
    message = "Something went wrong",
    public code: string = "ERROR",
    public errors: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message: string, errors: unknown[] = []) {
    return new ApiError(400, message, "BAD_REQUEST", errors);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }
  static forbidden(message = "Not allowed") {
    return new ApiError(403, message, "FORBIDDEN");
  }
  static notFound(message = "Not found") {
    return new ApiError(404, message, "NOT_FOUND");
  }
  static validation(message: string, errors: unknown[] = []) {
    return new ApiError(422, message, "VALIDATION", errors);
  }
  static internal(message = "Something went wrong") {
    return new ApiError(500, message, "INTERNAL");
  }
}
