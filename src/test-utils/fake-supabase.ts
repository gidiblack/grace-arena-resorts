/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal in-memory stand-in for the supabase-js query builder, sufficient for exercising
 * API route logic in unit tests: filters, conditional updates, single/maybeSingle semantics,
 * unique constraints (23505), RPC stubs and the auth admin API.
 */
import crypto from "node:crypto";

type Row = Record<string, any>;
type Filter = (row: Row) => boolean;
type Result = { data: any; error: any; count?: number | null; status: number };

const UNIQUE_KEYS: Record<string, string[][]> = {
  users: [["email"]],
  bookings: [["reference"]],
  newsletter_subscribers: [["email"]],
  notify_me_registrations: [["room_type_id", "email"]],
  webhook_events: [["provider", "event_key"]],
  auth_tokens: [["token_hash"]],
  payments: [["gateway", "gateway_reference"]],
};

function compare(a: any, b: any): number {
  const na = Number(a);
  const nb = Number(b);
  if (a !== null && b !== null && a !== "" && b !== "" && !isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

function parseValue(raw: string): any {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

/** Splits on commas that are not inside parentheses or double-quoted values */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let quoted = false;
  let escaped = false;
  for (const ch of input) {
    if (quoted) {
      current += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

/** Strips PostgREST double quotes and unescapes backslash sequences inside them */
function unquote(raw: string): string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\(.)/g, "$1");
  }
  return raw;
}

function likeToRegExp(pattern: string): RegExp {
  return new RegExp(
    `^${pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/%/g, ".*")
      .replace(/_/g, ".")}$`,
    "i"
  );
}

function parseOrExpression(expr: string): Filter {
  const clauses = splitTopLevel(expr).map(parseClause);
  return (row) => clauses.some((c) => c(row));
}

function parseClause(clause: string): Filter {
  if (clause.startsWith("and(") && clause.endsWith(")")) {
    const inner = splitTopLevel(clause.slice(4, -1)).map(parseClause);
    return (row) => inner.every((c) => c(row));
  }
  const [column, op, ...rest] = clause.split(".");
  const value = unquote(rest.join("."));
  switch (op) {
    case "ilike": {
      const re = likeToRegExp(value);
      return (row) => re.test(String(row[column] ?? ""));
    }
    case "eq":
      return (row) => String(row[column]) === value;
    case "neq":
      return (row) => String(row[column]) !== value;
    case "gt":
      return (row) => row[column] !== null && compare(row[column], value) > 0;
    case "gte":
      return (row) => row[column] !== null && compare(row[column], value) >= 0;
    case "lt":
      return (row) => row[column] !== null && compare(row[column], value) < 0;
    case "lte":
      return (row) => row[column] !== null && compare(row[column], value) <= 0;
    case "is":
      return (row) => row[column] === parseValue(value);
    case "in": {
      const list = value.replace(/^\(|\)$/g, "").split(",");
      return (row) => list.includes(String(row[column]));
    }
    default:
      throw new Error(`fake-supabase: unsupported or() operator ${op}`);
  }
}

export const FAKE_STORAGE_URL = "https://fake.supabase.test/storage/v1";

export class FakeSupabase {
  tables: Record<string, Row[]> = {};
  rpcHandlers: Record<string, (args: any) => Result | Promise<Result>> = {};
  /** Storage objects keyed by "<bucket>/<path>"; read back via storageFetch for public URLs */
  storageObjects = new Map<string, { bytes: Uint8Array }>();

  putStorageObject(bucket: string, path: string, bytes: Uint8Array) {
    this.storageObjects.set(`${bucket}/${path}`, { bytes });
  }

  /** fetch stand-in serving public and signed object URLs from storageObjects */
  storageFetch = async (url: string): Promise<Response> => {
    const match = url.match(/\/object\/(?:public|sign)\/([^?]+)/);
    const object = match ? this.storageObjects.get(decodeURIComponent(match[1])) : undefined;
    if (!object) return new Response(null, { status: 404 });
    return new Response(new Blob([object.bytes as BlobPart]), { status: 200 });
  };
  authUsers: Array<{
    id: string;
    email: string;
    password: string;
    user_metadata: Row;
    email_confirmed_at: string | null;
  }> = [];
  /** access token -> user id */
  sessions = new Map<string, string>();
  /** refresh token -> user id */
  refreshTokens = new Map<string, string>();

  seed(table: string, rows: Row[]) {
    this.tables[table] = [...(this.tables[table] || []), ...rows.map((r) => ({ ...r }))];
    return this;
  }

  rows(table: string): Row[] {
    return (this.tables[table] ||= []);
  }

  issueSession(userId: string) {
    const access = `access-${crypto.randomUUID()}`;
    const refresh = `refresh-${crypto.randomUUID()}`;
    this.sessions.set(access, userId);
    this.refreshTokens.set(refresh, userId);
    return { access_token: access, refresh_token: refresh, expires_in: 3600 };
  }

  /** Service-role client (getSupabaseAdminClient) */
  get client(): any {
    return {
      from: (table: string) => new QueryBuilder(this, table),
      storage: {
        from: (bucket: string) => ({
          createSignedUploadUrl: async (path: string) => ({
            data: {
              path,
              token: `token-${path}`,
              signedUrl: `${FAKE_STORAGE_URL}/object/upload/sign/${bucket}/${path}?token=t`,
            },
            error: null,
          }),
          info: async (path: string) => {
            const object = this.storageObjects.get(`${bucket}/${path}`);
            return object
              ? { data: { name: path, size: object.bytes.length }, error: null }
              : { data: null, error: { message: "Object not found" } };
          },
          createSignedUrl: async (path: string) => ({
            data: { signedUrl: `${FAKE_STORAGE_URL}/object/sign/${bucket}/${path}?token=t` },
            error: null,
          }),
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `${FAKE_STORAGE_URL}/object/public/${bucket}/${path}` },
          }),
          remove: async (paths: string[]) => {
            for (const path of paths) this.storageObjects.delete(`${bucket}/${path}`);
            return { data: paths.map((name) => ({ name })), error: null };
          },
        }),
      },
      rpc: async (name: string, args: any) => {
        const handler = this.rpcHandlers[name];
        if (!handler) return { data: null, error: { message: `no rpc ${name}` }, status: 404 };
        return handler(args);
      },
      auth: {
        getUser: async (token: string) => {
          const id = this.sessions.get(token);
          const user = id ? this.authUsers.find((u) => u.id === id) : undefined;
          return user
            ? { data: { user }, error: null }
            : { data: { user: null }, error: { message: "invalid token" } };
        },
        admin: {
          createUser: async (attrs: any) => {
            if (this.authUsers.some((u) => u.email === attrs.email)) {
              return {
                data: { user: null },
                error: { code: "email_exists", status: 422, message: "already registered" },
              };
            }
            const user = {
              id: crypto.randomUUID(),
              email: attrs.email,
              password: attrs.password,
              user_metadata: attrs.user_metadata || {},
              email_confirmed_at: attrs.email_confirm ? new Date().toISOString() : null,
            };
            this.authUsers.push(user);
            return { data: { user }, error: null };
          },
          deleteUser: async (id: string) => {
            this.authUsers = this.authUsers.filter((u) => u.id !== id);
            return { data: {}, error: null };
          },
          updateUserById: async (id: string, attrs: any) => {
            const user = this.authUsers.find((u) => u.id === id);
            if (!user) return { data: { user: null }, error: { message: "not found" } };
            if (attrs.password) user.password = attrs.password;
            if (attrs.email_confirm) user.email_confirmed_at = new Date().toISOString();
            return { data: { user }, error: null };
          },
          signOut: async (token: string) => {
            this.sessions.delete(token);
            return { error: null };
          },
        },
      },
    };
  }

  /** Per-request anon client (createSupabaseAuthClient) */
  get authClient(): any {
    return {
      auth: {
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
          const user = this.authUsers.find((u) => u.email === email);
          if (!user || user.password !== password) {
            return {
              data: { session: null, user: null },
              error: {
                code: "invalid_credentials",
                status: 400,
                message: "Invalid login credentials",
              },
            };
          }
          if (!user.email_confirmed_at) {
            return {
              data: { session: null, user: null },
              error: { code: "email_not_confirmed", status: 400, message: "Email not confirmed" },
            };
          }
          return { data: { session: this.issueSession(user.id), user }, error: null };
        },
        refreshSession: async ({ refresh_token }: { refresh_token: string }) => {
          const userId = this.refreshTokens.get(refresh_token);
          if (!userId) return { data: { session: null }, error: { message: "invalid refresh" } };
          this.refreshTokens.delete(refresh_token);
          return { data: { session: this.issueSession(userId) }, error: null };
        },
      },
    };
  }
}

class QueryBuilder implements PromiseLike<Result> {
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: any = null;
  private filters: Filter[] = [];
  private returning = false;
  private countRequested = false;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private orderBy: { column: string; ascending: boolean } | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private limitN: number | null = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(
    private db: FakeSupabase,
    private table: string
  ) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.countRequested = Boolean(options?.count);
    else this.returning = true;
    return this;
  }
  insert(payload: any) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  upsert(payload: any, options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = payload;
    this.upsertOptions = options;
    return this;
  }
  update(payload: any) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: any) {
    this.filters.push((r) => r[column] === value);
    return this;
  }
  neq(column: string, value: any) {
    this.filters.push((r) => r[column] !== value);
    return this;
  }
  is(column: string, value: any) {
    this.filters.push((r) => (r[column] ?? null) === value);
    return this;
  }
  in(column: string, values: any[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }
  gt(column: string, value: any) {
    this.filters.push((r) => r[column] != null && compare(r[column], value) > 0);
    return this;
  }
  gte(column: string, value: any) {
    this.filters.push((r) => r[column] != null && compare(r[column], value) >= 0);
    return this;
  }
  lt(column: string, value: any) {
    this.filters.push((r) => r[column] != null && compare(r[column], value) < 0);
    return this;
  }
  lte(column: string, value: any) {
    this.filters.push((r) => r[column] != null && compare(r[column], value) <= 0);
    return this;
  }
  /** Array column contains every given value (PostgREST cs) */
  contains(column: string, values: any[]) {
    this.filters.push(
      (r) => Array.isArray(r[column]) && values.every((v) => r[column].includes(v))
    );
    return this;
  }
  ilike(column: string, pattern: string) {
    const re = likeToRegExp(pattern);
    this.filters.push((r) => re.test(String(r[column] ?? "")));
    return this;
  }
  or(expression: string) {
    this.filters.push(parseOrExpression(expression));
    return this;
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): Promise<T1 | T2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private matches(row: Row) {
    return this.filters.every((f) => f(row));
  }

  private violatesUnique(row: Row, ignore?: Row): boolean {
    return (UNIQUE_KEYS[this.table] || []).some((cols) =>
      this.db
        .rows(this.table)
        .some(
          (existing) =>
            existing !== ignore &&
            cols.every(
              (c) =>
                existing[c] != null &&
                String(existing[c]).toLowerCase() === String(row[c]).toLowerCase()
            )
        )
    );
  }

  private withDefaults(row: Row): Row {
    const now = new Date().toISOString();
    return { id: crypto.randomUUID(), created_at: now, updated_at: now, ...row };
  }

  private shape(rows: Row[], count?: number): Result {
    if (this.mode === "single") {
      if (rows.length !== 1) {
        return { data: null, error: { code: "PGRST116", message: "not single" }, status: 406 };
      }
      return { data: { ...rows[0] }, error: null, status: 200 };
    }
    if (this.mode === "maybeSingle") {
      if (rows.length > 1) {
        return { data: null, error: { code: "PGRST116", message: "multiple rows" }, status: 406 };
      }
      return { data: rows[0] ? { ...rows[0] } : null, error: null, status: 200 };
    }
    return {
      data: rows.map((r) => ({ ...r })),
      error: null,
      count: this.countRequested ? (count ?? rows.length) : null,
      status: 200,
    };
  }

  private execute(): Result {
    const table = this.db.rows(this.table);

    if (this.op === "select") {
      let rows = table.filter((r) => this.matches(r));
      const total = rows.length;
      if (this.orderBy) {
        const { column, ascending } = this.orderBy;
        rows = [...rows].sort((a, b) => compare(a[column], b[column]) * (ascending ? 1 : -1));
      }
      if (this.rangeFrom !== null) rows = rows.slice(this.rangeFrom, (this.rangeTo ?? 0) + 1);
      if (this.limitN !== null) rows = rows.slice(0, this.limitN);
      return this.shape(rows, total);
    }

    if (this.op === "insert") {
      const input = Array.isArray(this.payload) ? this.payload : [this.payload];
      const created: Row[] = [];
      for (const raw of input) {
        const row = this.withDefaults(raw);
        if (this.violatesUnique(row)) {
          return { data: null, error: { code: "23505", message: "duplicate key" }, status: 409 };
        }
        table.push(row);
        created.push(row);
      }
      return this.returning ? this.shape(created) : { data: null, error: null, status: 201 };
    }

    if (this.op === "upsert") {
      const input = Array.isArray(this.payload) ? this.payload : [this.payload];
      const conflictCols = (this.upsertOptions.onConflict || "id").split(",").map((c) => c.trim());
      const out: Row[] = [];
      for (const raw of input) {
        const existing = table.find((r) =>
          conflictCols.every((c) => r[c] !== undefined && r[c] === raw[c])
        );
        if (existing) {
          if (!this.upsertOptions.ignoreDuplicates) {
            Object.assign(existing, raw, { updated_at: new Date().toISOString() });
          }
          out.push(existing);
        } else {
          const row = this.withDefaults(raw);
          table.push(row);
          out.push(row);
        }
      }
      return this.returning ? this.shape(out) : { data: null, error: null, status: 201 };
    }

    if (this.op === "update") {
      const targets = table.filter((r) => this.matches(r));
      for (const row of targets) {
        Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
      }
      return this.returning ? this.shape(targets) : { data: null, error: null, status: 204 };
    }

    const remaining = table.filter((r) => !this.matches(r));
    this.db.tables[this.table] = remaining;
    return { data: null, error: null, status: 204 };
  }
}
