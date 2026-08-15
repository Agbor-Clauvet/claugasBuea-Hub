-- =========================================================
-- RATE LIMITING (for edge functions)
--
-- Generic sliding-window rate limiter backing store. Each row is one
-- "hit" against some key (e.g. "campay-initiate:user:<uuid>"). To check
-- a limit: count rows for that key newer than (now - window), and also
-- delete rows older than the window while you're at it — that keeps the
-- table self-pruning with zero cron jobs needed, since every check for
-- a given key cleans up that key's own stale rows.
--
-- Only service_role (used exclusively by edge functions, never the
-- browser) can touch this table — there's deliberately no anon/
-- authenticated policy, so RLS denies everyone else by default.
-- =========================================================
CREATE TABLE public.rate_limit_hits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_hits_key_created_at ON public.rate_limit_hits (key, created_at);

GRANT ALL ON public.rate_limit_hits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_hits_id_seq TO service_role;

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- No policies added on purpose: RLS with zero policies denies anon and
-- authenticated entirely, while service_role bypasses RLS as usual.
