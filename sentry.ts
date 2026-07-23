// Shared Sentry setup for both the browser and the server.
//
// The DSN is read from an environment variable rather than hardcoded, so it
// can be rotated without a code change. It's NOT a secret in the usual
// sense — Sentry DSNs are designed to be publicly embedded in browser
// bundles — but using an env var keeps it in one place and out of git
// history if it's ever regenerated.
//
// Requires VITE_SENTRY_DSN to be set in both:
//   - your local .env file (for local testing)
//   - Vercel's Project Settings -> Environment Variables (for production)
import * as Sentry from "@sentry/tanstackstart-react";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  initialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    // No DSN configured yet — no-op rather than throwing, so the app keeps
    // working normally while Sentry is being set up.
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Keep this modest: full session replay / high trace sampling isn't
    // needed for a project at this stage, and costs against Sentry's free
    // tier quota. Raise this later if/when it's worth the detail.
    tracesSampleRate: 0.1,
  });
}

// Safe to call even if Sentry was never initialized (e.g. DSN not yet
// configured) — Sentry's SDK no-ops captureException calls before init.
export function captureSentryException(error: unknown) {
  Sentry.captureException(error);
}
