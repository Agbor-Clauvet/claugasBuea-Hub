// Shared sliding-window rate limiter for edge functions, backed by the
// rate_limit_hits table (see migration 20260815140000_rate_limit_hits.sql).
//
// Usage:
//   const { allowed, retryAfterSeconds } = await checkRateLimit(supabase, {
//     key: `campay-initiate:user:${user.id}`,
//     windowSeconds: 600,
//     maxHits: 5,
//   });
//   if (!allowed) return new Response(..., { status: 429 });
//
// `supabase` must be a client created with the SERVICE ROLE key — this
// table has no RLS policies for anon/authenticated, so a user-scoped
// client can't read or write it.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function checkRateLimit(
  supabase: SupabaseClient,
  opts: { key: string; windowSeconds: number; maxHits: number },
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const { key, windowSeconds, maxHits } = opts;
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Self-pruning: delete this key's stale hits every time it's checked,
  // so the table never accumulates rows for keys that are still active.
  await supabase.from("rate_limit_hits").delete().eq("key", key).lt("created_at", windowStart);

  const { count, error } = await supabase
    .from("rate_limit_hits")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart);

  // Fail OPEN, not closed: if the rate-limit check itself errors (e.g. a
  // transient DB issue), we let the request through rather than blocking
  // real customers because of an infrastructure hiccup on our side.
  if (error) {
    console.error("Rate limit check failed, allowing request:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if ((count ?? 0) >= maxHits) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  await supabase.from("rate_limit_hits").insert({ key });
  return { allowed: true, retryAfterSeconds: 0 };
}
