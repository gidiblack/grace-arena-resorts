import en from "./en.json";

export type TranslationKey = string;

/**
 * Access a nested translation string via dot-notation path (e.g. "brand.name").
 * Falls back to returning the key if not found.
 */
export function t(key: string, variables?: Record<string, string | number>): string {
  const parts = key.split(".");
  let current: unknown = en;

  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof current !== "string") {
    return key;
  }

  if (!variables) {
    return current;
  }

  return Object.entries(variables).reduce((str, [varKey, val]) => {
    return str.replace(new RegExp(`\\{${varKey}\\}`, "g"), String(val));
  }, current);
}

export { en };
