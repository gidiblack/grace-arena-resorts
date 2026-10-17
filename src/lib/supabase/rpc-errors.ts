export interface RpcErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

export interface RpcFailure {
  code: string;
  message: string;
  status: number;
}

/**
 * Plpgsql functions raise bare tokens (RAISE EXCEPTION 'ROOM_NOT_AVAILABLE'), which PostgREST
 * returns as error.message. Unique violations (SQLSTATE 23505) surface as UNIQUE_VIOLATION.
 */
export function rpcErrorToken(error: RpcErrorLike | null | undefined): string | null {
  if (!error) return null;
  if (error.code === "23505") return "UNIQUE_VIOLATION";
  if (error.code === "PGRST202") return "RPC_MISSING";
  const message = (error.message || "").trim();
  return /^[A-Z][A-Z0-9_]+$/.test(message) ? message : null;
}

/**
 * Maps an RPC error to an API failure using a table of known tokens. Unknown errors become a 500
 * so callers never report success after a failed database write.
 */
export function mapRpcError(
  error: RpcErrorLike,
  known: Record<string, Omit<RpcFailure, "code"> & { code?: string }>,
  fallbackMessage: string
): RpcFailure {
  const token = rpcErrorToken(error);
  if (token && known[token]) {
    const entry = known[token];
    const detail = error.details ? ` (${error.details})` : "";
    return {
      code: entry.code || token,
      message: `${entry.message}${detail}`,
      status: entry.status,
    };
  }
  if (token === "RPC_MISSING") {
    return {
      code: "SCHEMA_OUT_OF_DATE",
      message: "Database migrations are out of date: required function is missing",
      status: 500,
    };
  }
  return { code: "DB_ERROR", message: fallbackMessage, status: 500 };
}
