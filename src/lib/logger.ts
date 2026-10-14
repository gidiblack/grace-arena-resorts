type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEY_REGEX = /(?:password|token|secret|authorization|cookie|key)/i;

export function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  if (typeof obj === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        redacted[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = redactSensitiveData(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  return obj;
}

function formatLog(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    const cleanMeta = redactSensitiveData(meta);
    return `${base} ${JSON.stringify(cleanMeta)}`;
  }
  return base;
}

export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", message, meta));
    }
  },
  info: (message: string, meta?: unknown) => {
    console.info(formatLog("info", message, meta));
  },
  warn: (message: string, meta?: unknown) => {
    console.warn(formatLog("warn", message, meta));
  },
  error: (message: string, error?: unknown, meta?: unknown) => {
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            ...(error as unknown as Record<string, unknown>),
          }
        : error;
    console.error(
      formatLog("error", message, {
        error: errorDetails,
        ...(meta && typeof meta === "object" ? meta : { meta }),
      })
    );
  },
};
