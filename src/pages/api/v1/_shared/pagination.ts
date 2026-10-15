import type { NextApiRequest, NextApiResponse } from "next";

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Extracts and sanitizes standard pagination query parameters: ?page=1&limit=20
 */
export function parsePagination(
  req: NextApiRequest,
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  const pageQuery = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
  const limitQuery = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;

  const parsedPage = parseInt(pageQuery || "1", 10);
  const parsedLimit = parseInt(limitQuery || defaultLimit.toString(), 10);

  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, maxLimit)
      : defaultLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Attaches X-Total-Count, X-Total-Pages, X-Page, and X-Limit headers per GAR-SRS Section 7
 */
export function setPaginationHeaders(
  res: NextApiResponse,
  totalCount: number,
  page: number,
  limit: number
): void {
  const totalPages = Math.ceil(Math.max(0, totalCount) / limit);

  res.setHeader("X-Total-Count", totalCount.toString());
  res.setHeader("X-Total-Pages", totalPages.toString());
  res.setHeader("X-Page", page.toString());
  res.setHeader("X-Limit", limit.toString());
}

export default function notFound(_req: NextApiRequest, res: NextApiResponse) {
  res.status(404).end();
}
