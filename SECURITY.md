# Security Policy

## Reporting a vulnerability

If you find a security issue in ClaúGas, please **do not open a public
GitHub issue**. Instead, email **clauvetmt19988@gmail.com** with:

- A description of the issue and its potential impact
- Steps to reproduce it
- Any relevant logs, screenshots, or a proof-of-concept

We'll acknowledge your report as soon as possible and work with you on a
fix before any public disclosure.

## What's already in place

- **Row-level security (RLS)** is enabled on every table — customers,
  retailers, and admins can only read/write data they're actually
  entitled to.
- **Order pricing is enforced server-side.** A database trigger recomputes
  and locks `total`/`subtotal`/`delivery_fee` on every order — these
  fields cannot be changed by a direct client update, even via a
  compromised session or a manually crafted request.
- **Payments are ownership-checked.** The Campay payment functions verify
  the authenticated user actually owns the order before initiating any
  charge, and the amount is always read server-side from the order record
  — never trusted from the client.
- **Secrets stay server-side.** API keys and service-role credentials are
  never bundled into the frontend or committed to the repository.
- **HTTP security headers** (clickjacking, MIME-sniffing, forced HTTPS)
  are set via `vercel.json`.
- **Dependencies** are audited regularly; known vulnerabilities are
  patched promptly.

## Known limitations

- No Content-Security-Policy header yet — planned, but needs careful
  testing against every third-party script/asset the app loads before
  being added.
- The Campay webhook uses a shared-secret query parameter rather than
  cryptographic request signing.

If you notice something in this list that no longer reflects reality,
that's worth reporting too.
