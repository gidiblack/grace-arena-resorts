export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code = "INTERNAL_ERROR", statusCode = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, "BAD_REQUEST", 400, details);
  }

  static unauthorized(message = "Unauthorized", details?: unknown) {
    return new AppError(message, "UNAUTHORIZED", 401, details);
  }

  static forbidden(message = "Forbidden", details?: unknown) {
    return new AppError(message, "FORBIDDEN", 403, details);
  }

  static notFound(message = "Resource not found", details?: unknown) {
    return new AppError(message, "NOT_FOUND", 404, details);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(message, "CONFLICT", 409, details);
  }

  static rateLimited(message = "Rate limit exceeded. Please try again later.", details?: unknown) {
    return new AppError(message, "RATE_LIMITED", 429, details);
  }

  static internal(message = "An unexpected error occurred", details?: unknown) {
    return new AppError(message, "INTERNAL_ERROR", 500, details);
  }
}
