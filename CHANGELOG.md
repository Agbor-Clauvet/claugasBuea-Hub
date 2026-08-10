# Changelog

All notable changes to ClaúGas are documented here. Dates are in
`YYYY-MM-DD`, based on actual commit history.

## [Unreleased]

- Campay live account activation — pending
- Real Cameroon WhatsApp business number — pending (currently a test
  India number, swap before real customers arrive)

## 2026-08-10 — 2026-08-11

- **Critical fix:** `campay-initiate` and `campay-webhook` Edge Function
  contents had been swapped, which would have broken every Mobile Money
  payment attempt — fixed and redeployed
- Patched 5 dependency vulnerabilities (3 high, 2 moderate)
- Removed remaining leftover Lovable package references

## 2026-07-24

- Added Campay Mobile Money integration (payment initiation + webhook
  confirmation) and SMS/WhatsApp order-status notifications via Termii
- Wired the admin nav and a model-accuracy page into all three languages

## 2026-07-21 — 2026-07-23

- Removed all remaining Lovable-specific build tooling; `vite.config.ts`
  now configures the build independently
- Added SEO basics: sitemap, robots.txt, LocalBusiness structured data
- Added customer self-cancel for pending/confirmed orders
- Full translation audit across English/French/Pidgin
- Added Sentry error monitoring (client + server)

## 2026-07-20

- Admin orders page: customer name/phone, search, and status filter
- Synced `<html lang>` to the active language; translated the 404 and
  error-boundary pages
- Added HTTP security headers (clickjacking, HSTS, MIME-sniffing
  protection)
- Mobile: fixed a hidden Login button and a Login/Register tab mismatch
  on narrow screens
- Removed cosmetic Lovable artifacts (dead telemetry hook, planning
  metadata, Lovable-branded error text, and the shared social-preview
  image)

## 2026-07-19

- **Critical security fix:** order pricing (subtotal/delivery
  fee/total) is now recomputed and locked server-side — can no longer
  be manipulated from the client
- Retailer dashboard: customers page, delete-order button, and the
  ability for retailers to view their own customers' profile info
- Order status now auto-refetches when a backgrounded tab regains focus

## 2026-07-15 — 2026-07-18

- Added the marketplace foundation (retailers table, `retailer_id` on
  cylinders/orders) and a first retailer dashboard MVP
- App-wide dark mode with persistence
- Real PDF receipt downloads
- Automatic distance-based delivery fee calculation
- Live order-status updates via Supabase Realtime
- Admin in-stock toggle; booking blocked when a cylinder is out of stock
- Terms of Service and Privacy Policy pages
- Global WhatsApp contact button
- Repo made public; pinned the Vercel/Nitro build preset (previously
  defaulted to Cloudflare, which broke dynamic routes)

## 2026-07-06 — 2026-07-14

- Initial Supabase connection, auth, and RLS
- i18n scaffold (English/French/Pidgin) and full ClaúGas rebrand
- Address management (local Buea quarters)
- Booking flow: quantity selector, payment method choice
- Real cylinder photos, receipts, and tracking numbers

## Earlier

Project originally scaffolded in [Lovable](https://lovable.dev) before
migrating to independent development in this repository. Early
Lovable-era commit history exists in this repo's git log but isn't
itemized here, since Lovable's autosave produced many undifferentiated
commits with generic messages.
