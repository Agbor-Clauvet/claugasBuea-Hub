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
  return `${n.toLocaleString()} ${CURRENCY_SUFFIX}`;
}
