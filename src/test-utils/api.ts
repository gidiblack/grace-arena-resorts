/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

export interface MockCall {
  req: NextApiRequest;
  res: NextApiResponse;
  status: () => number;
  body: () => any;
  header: (name: string) => any;
}

/**
 * Builds a Next.js API request/response pair. Defaults to a same-origin browser request.
 */
export function mockApiCall(
  options: {
    method?: string;
    query?: Record<string, string | string[]>;
    body?: any;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    url?: string;
  } = {}
): MockCall {
  const req = {
    method: options.method || "GET",
    url: options.url || "/api/v1/test",
    query: options.query || {},
    body: options.body ?? {},
    headers: { "sec-fetch-site": "same-origin", ...(options.headers || {}) },
    cookies: options.cookies || {},
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;

  let statusCode = 200;
  let payload: any = null;
  let ended = false;
  const headers: Record<string, any> = {};

  const res = {
    get writableEnded() {
      return ended;
    },
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: any) => {
      payload = data;
      ended = true;
      return res;
    }),
    send: vi.fn((data: any) => {
      payload = data;
      ended = true;
      return res;
    }),
    end: vi.fn(() => {
      ended = true;
      return res;
    }),
    setHeader: vi.fn((key: string, value: any) => {
      headers[key.toLowerCase()] = value;
      return res;
    }),
    getHeader: vi.fn((key: string) => headers[key.toLowerCase()]),
  } as unknown as NextApiResponse;

  return {
    req,
    res,
    status: () => statusCode,
    body: () => payload,
    header: (name: string) => headers[name.toLowerCase()],
  };
}

/** Extracts `name=value` from a Set-Cookie header array */
export function cookieValue(setCookie: string[] | undefined, name: string): string | undefined {
  const entry = (setCookie || []).filter((c) => c.startsWith(`${name}=`)).pop();
  return entry ? decodeURIComponent(entry.split(";")[0].slice(name.length + 1)) : undefined;
}
