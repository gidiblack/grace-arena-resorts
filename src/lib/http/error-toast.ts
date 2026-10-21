import { toaster } from "@/components/ui/toaster";

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: unknown;
}

export interface ServerErrorToastOptions {
  title?: string;
  fallbackMessage?: string;
  duration?: number;
  status?: number;
}

const ERROR_CODE_TITLES: Record<string, string> = {
  VALIDATION_ERROR: "Validation Error",
  INVALID_CREDENTIALS: "Authentication Failed",
  UNAUTHORIZED: "Authentication Required",
  FORBIDDEN: "Access Denied",
  NOT_FOUND: "Not Found",
  RATE_LIMIT_EXCEEDED: "Too Many Requests",
  ACCOUNT_LOCKED: "Account Locked",
  EMAIL_NOT_VERIFIED: "Email Not Verified",
  HOLD_EXPIRED: "Reservation Hold Expired",
  PAYMENT_FAILED: "Payment Failed",
  INTERNAL_ERROR: "Server Error",
  SERVICE_UNAVAILABLE: "Service Unavailable",
  NETWORK_ERROR: "Network Error",
};

/**
 * Converts a snake_case or SCREAMING_SNAKE_CASE error code into a human-readable title.
 */
export function formatErrorTitle(code?: string, status?: number): string {
  if (code && ERROR_CODE_TITLES[code.toUpperCase()]) {
    return ERROR_CODE_TITLES[code.toUpperCase()];
  }

  if (code && typeof code === "string") {
    // E.g. "SUBSCRIBE_FAILED" -> "Subscribe Failed"
    return code
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  if (status) {
    if (status === 400) return "Bad Request";
    if (status === 401) return "Authentication Required";
    if (status === 403) return "Access Denied";
    if (status === 404) return "Resource Not Found";
    if (status === 409) return "Conflict";
    if (status === 422) return "Validation Error";
    if (status === 429) return "Too Many Requests";
    if (status === 500) return "Internal Server Error";
    if (status === 502) return "Bad Gateway";
    if (status === 503) return "Service Unavailable";
    if (status === 504) return "Gateway Timeout";
    return `Server Error (${status})`;
  }

  return "Server Error";
}

/**
 * Extracts a readable error description from an error object, string, or details payload.
 */
export function formatErrorDescription(
  error: unknown,
  fallback = "An unexpected server error occurred. Please try again."
): string {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const errObj = error as Record<string, unknown>;

    // Handle nested error envelope: { error: { message, ... } }
    if (errObj.error && typeof errObj.error === "object") {
      return formatErrorDescription(errObj.error, fallback);
    }

    // Handle details array with validation issues (e.g. Zod validation details)
    if (Array.isArray(errObj.details) && errObj.details.length > 0) {
      const issues = errObj.details
        .map((d) => {
          if (typeof d === "string") return d;
          if (typeof d === "object" && d !== null) {
            const item = d as Record<string, unknown>;
            if (item.message && item.field) {
              return `${item.field}: ${item.message}`;
            }
            if (item.message) return String(item.message);
          }
          return null;
        })
        .filter(Boolean);

      if (issues.length > 0) {
        return issues.join(" • ");
      }
    }

    if (typeof errObj.message === "string" && errObj.message.trim()) {
      return errObj.message;
    }

    if (typeof errObj.description === "string" && errObj.description.trim()) {
      return errObj.description;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// Recent toast cache to prevent identical toast spam within a short window
const recentToasts = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 1500;

/**
 * Displays a Chakra-UI error toast on the top-right corner with formatted title and description.
 */
export function showServerErrorToast(
  error: unknown,
  options?: ServerErrorToastOptions
): string | undefined {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as Record<string, unknown>).code)
      : undefined;

  const title = options?.title || formatErrorTitle(code, options?.status);
  const description = formatErrorDescription(error, options?.fallbackMessage);

  const dedupeKey = `${title}:::${description}`;
  const now = Date.now();
  const lastShown = recentToasts.get(dedupeKey);

  if (lastShown && now - lastShown < DEDUPLICATION_WINDOW_MS) {
    return undefined;
  }

  recentToasts.set(dedupeKey, now);

  // Clean up old entries periodically
  if (recentToasts.size > 50) {
    recentToasts.forEach((timestamp, key) => {
      if (now - timestamp > DEDUPLICATION_WINDOW_MS * 2) {
        recentToasts.delete(key);
      }
    });
  }

  return toaster.create({
    title,
    description,
    type: "error",
    duration: options?.duration ?? 6000,
  });
}

declare global {
  interface Window {
    __gar_error_toaster_installed?: boolean;
  }
}

function isApiRequest(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("/api/") ||
    url.includes("/api/v1/") ||
    url.startsWith(`${window.location.origin}/api/`)
  );
}

/**
 * Initializes a global client-side fetch interceptor that catches any failing API response
 * (HTTP status >= 400 or network errors) and displays an error toast on the top right corner.
 */
export function setupGlobalErrorToaster(): void {
  if (typeof window === "undefined" || window.__gar_error_toaster_installed) {
    return;
  }

  window.__gar_error_toaster_installed = true;
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const [resource, config] = args;
    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof Request
          ? resource.url
          : resource instanceof URL
            ? resource.toString()
            : "";

    // Allow callers to skip toast notification with custom header
    const headers = config?.headers;
    const hasSkipHeader =
      headers &&
      typeof headers === "object" &&
      ("x-skip-error-toast" in headers ||
        (headers instanceof Headers && headers.get("x-skip-error-toast") === "true"));

    // Skip silent background checks (e.g. checking if guest is signed in on public pages)
    const isSilentAuthCheck =
      url.includes("/api/v1/auth/me") &&
      (!config || !config.method || config.method.toUpperCase() === "GET");

    const skipToast = Boolean(hasSkipHeader || isSilentAuthCheck);

    try {
      const response = await originalFetch(...args);

      if (!response.ok && !skipToast && isApiRequest(url)) {
        try {
          const clone = response.clone();
          const contentType = clone.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const data = await clone.json();
            if (data && data.error) {
              showServerErrorToast(data.error, { status: response.status });
            } else if (data && data.message) {
              showServerErrorToast({ message: data.message }, { status: response.status });
            } else {
              showServerErrorToast(
                { message: response.statusText || `Request failed with status ${response.status}` },
                { status: response.status }
              );
            }
          } else {
            const text = await clone.text();
            // Don't toast huge HTML error pages; truncate to readable error text
            const cleanText = text
              .replace(/<[^>]+>/g, " ")
              .trim()
              .slice(0, 160);
            showServerErrorToast(
              {
                message:
                  cleanText ||
                  response.statusText ||
                  `Request failed with status ${response.status}`,
              },
              { status: response.status }
            );
          }
        } catch {
          showServerErrorToast(
            { message: response.statusText || `Request failed with status ${response.status}` },
            { status: response.status }
          );
        }
      }

      return response;
    } catch (err) {
      if (!skipToast && isApiRequest(url)) {
        showServerErrorToast({
          code: "NETWORK_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Network error. Please check your internet connection.",
        });
      }
      throw err;
    }
  };
}
