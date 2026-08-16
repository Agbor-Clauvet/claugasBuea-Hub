/**
 * Single source of truth for displaying money in the app.
 *
 * Previously "X XAF" formatting was repeated inline in ~10 different
 * files. Centralizing it here means a currency/format change is a
 * one-line edit instead of a hunt-and-replace across the codebase.
 */

const CURRENCY_SUFFIX = "XAF";

/** Format a numeric amount as "1,234 XAF" (or "— XAF" style callers can override via fallback). */
export function formatCurrency(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (amount === null || amount === undefined || Number.isNaN(n)) return `— ${CURRENCY_SUFFIX}`;
  // Locale pinned explicitly to "en-US" — without this, toLocaleString()
  // falls back to whatever locale the host machine/server is set to,
  // which can silently produce a completely different digit grouping
  // (e.g. Indian-style "12,34,567" instead of "1,234,567"). Prices need
  // to look the same everywhere, not depend on server configuration.
  return `${n.toLocaleString("en-US")} ${CURRENCY_SUFFIX}`;
}
