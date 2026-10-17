const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Quotes a value for use inside a PostgREST `or()` expression. Double quotes stop reserved
 * characters (, . : ( )) in user input from breaking out of the filter; backslashes and quotes
 * are escaped inside the quotes.
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** `or()` expression matching `term` case-insensitively in any of `columns`. */
export function buildIlikeOrFilter(columns: string[], term: string): string {
  const pattern = quoteFilterValue(`%${term}%`);
  return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
}

/**
 * `or()` expression matching a row by primary key or slug. Non-GUID values only match the slug,
 * so a slug never reaches the uuid column (which would raise a cast error).
 */
export function idOrSlugFilter(idOrSlug: string): string {
  const value = quoteFilterValue(idOrSlug);
  return GUID_PATTERN.test(idOrSlug) ? `id.eq.${value},slug.eq.${value}` : `slug.eq.${value}`;
}
