import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { ZodSchema, ZodError } from "zod";
import crypto from "node:crypto";
import { fail } from "@/lib/http/response";
import { setSecurityHeaders } from "@/lib/security/headers";
import { validateCsrf } from "@/lib/security/csrf";
import { enforceRateLimit, RateLimitOptions } from "./rate-limit";
import { getAuthUser, requireRole, AuthUser } from "./auth";
import { logger } from "@/lib/logger";
import type { UserRole } from "@/types/db";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export interface ApiCtx {
  requestId: string;
  user?: AuthUser;
}

export interface ApiHandlerOptions<TBody = unknown, TQuery = unknown> {
  allowedMethods?: HttpMethod[];
  requireAuth?: boolean;
  requiredRoles?: UserRole[];
  rateLimit?: RateLimitOptions;
  bodySchema?: ZodSchema<TBody>;
  querySchema?: ZodSchema<TQuery>;
  skipCsrf?: boolean;
}

export type ComposableApiHandler<TResponse = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: ApiCtx
) => Promise<TResponse | void> | TResponse | void;

/**
 * Creates an enterprise-grade composable API route handler with:
 * - Request ID generation and correlation
 * - Security headers (HSTS, CSP, X-Frame-Options)
 * - HTTP method restriction
 * - CSRF verification on mutating actions
 * - Rate limiting enforcement
 * - Authentication & RBAC role checks
 * - Zod request body and query validation
 * - Centralized error catching and standardized envelope response
 */
export function withApi<TBody = unknown, TQuery = unknown>(
  handler: ComposableApiHandler,
  options: ApiHandlerOptions<TBody, TQuery> = {}
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = crypto.randomUUID();
    const ctx: ApiCtx = { requestId };

    // Set request ID header for tracing
    res.setHeader("X-Request-Id", requestId);

    // 1. Enforce baseline security headers
    setSecurityHeaders(res);

    // 2. Enforce HTTP method restriction
    if (options.allowedMethods && options.allowedMethods.length > 0) {
      const method = (req.method || "").toUpperCase() as HttpMethod;
      if (!options.allowedMethods.includes(method)) {
        res.setHeader("Allow", options.allowedMethods.join(", "));
        return fail(
          res,
          "METHOD_NOT_ALLOWED",
          `Method ${method} is not allowed on this endpoint`,
          405
        );
      }
    }

    // 3. Enforce CSRF protection for mutating requests
    if (!options.skipCsrf && !validateCsrf(req)) {
      return fail(res, "INVALID_CSRF_TOKEN", "Cross-site request forgery validation failed", 403);
    }

    // 4. Enforce rate limiting if configured
    if (options.rateLimit) {
      const allowed = await enforceRateLimit(req, res, options.rateLimit);
      if (!allowed) return;
    }

    // 5. Authentication & Role checks
    if (options.requireAuth || options.requiredRoles) {
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        const user = await requireRole(req, res, options.requiredRoles);
        if (!user) return;
        ctx.user = user;
      } else {
        const user = await getAuthUser(req, res);
        if (!user) {
          return fail(res, "UNAUTHORIZED", "Authentication required to access this resource", 401);
        }
        ctx.user = user;
      }
    } else {
      // Optional authentication: resolve user if present
      const optionalUser = await getAuthUser(req, res);
      if (optionalUser) {
        ctx.user = optionalUser;
      }
    }

    // 6. Validate query schema if specified
    if (options.querySchema) {
      const queryParse = options.querySchema.safeParse(req.query);
      if (!queryParse.success) {
        const validationIssues = queryParse.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }));
        return fail(
          res,
          "INVALID_QUERY_PARAMS",
          "Invalid request query parameters",
          400,
          validationIssues
        );
      }
      req.query = queryParse.data as typeof req.query;
    }

    // 7. Validate body schema if specified
    if (options.bodySchema && ["POST", "PUT", "PATCH"].includes((req.method || "").toUpperCase())) {
      const bodyParse = options.bodySchema.safeParse(req.body);
      if (!bodyParse.success) {
        const validationIssues = bodyParse.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }));
        return fail(
          res,
          "INVALID_REQUEST_BODY",
          "Invalid request body payload",
          400,
          validationIssues
        );
      }
      req.body = bodyParse.data;
    }

    // 8. Execute delegate handler
    try {
      await handler(req, res, ctx);
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return fail(res, "VALIDATION_ERROR", "Data validation failed", 400, err.issues);
      }

      logger.error("Unhandled API exception in handler", {
        requestId,
        url: req.url,
        method: req.method,
        error: err instanceof Error ? err.message : String(err),
      });

      if (!res.writableEnded) {
        return fail(
          res,
          "INTERNAL_ERROR",
          "An unexpected error occurred while processing your request",
          500,
          {
            requestId,
          }
        );
      }
    }
  };
}

export default function notFound(_req: NextApiRequest, res: NextApiResponse) {
  res.status(404).end();
}
