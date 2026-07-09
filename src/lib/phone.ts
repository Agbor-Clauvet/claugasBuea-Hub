// Cameroon phone helpers — MTN/Orange mobile numbers start with 6, 9 digits.

export const PHONE_EMAIL_DOMAIN = "phone.claugas.local";

/** Strip everything but digits. */
function digitsOnly(input: string): string {
  return (input || "").replace(/\D+/g, "");
}

/**
 * Normalize a Cameroon mobile number to E.164-like `237XXXXXXXXX` (12 digits).
 * Accepts inputs like `+237 6 12 34 56 78`, `6 12345678`, `237612345678`, etc.
 * Returns null if the number is not a valid Cameroon mobile (must start with 6, 9 digits after country code).
 */
export function normalizeCameroonPhone(input: string): string | null {
  let d = digitsOnly(input);
  if (!d) return null;
  if (d.startsWith("00237")) d = d.slice(2); // 00237... -> 237...
  if (d.length === 9 && d.startsWith("6")) d = "237" + d;
  if (d.length !== 12 || !d.startsWith("2376")) return null;
  return d;
}

/** Human-readable format: `+237 6XX XX XX XX`. */
export function formatCameroonPhone(input: string): string {
  const norm = normalizeCameroonPhone(input);
  if (!norm) return input;
  const local = norm.slice(3); // 9 digits
  return `+237 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
}

/** Synthetic Supabase email derived from a phone (accounts registered via phone with no real email). */
export function phoneToSyntheticEmail(phone: string): string | null {
  const norm = normalizeCameroonPhone(phone);
  if (!norm) return null;
  return `${norm}@${PHONE_EMAIL_DOMAIN}`;
}

export function isSyntheticPhoneEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}
