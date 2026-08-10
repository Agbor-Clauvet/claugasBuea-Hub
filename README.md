<p align="center">
  <img src="src/assets/brand/claugas-express-logo.webp" width="220" alt="ClaúGas logo" />
</p>

<h1 align="center">ClaúGas</h1>
<p align="center"><b>Smart cooking gas cylinder delivery for Buea, Cameroon.</b></p>

<p align="center">
  <a href="https://claugas-foundation.vercel.app">Live site</a>
</p>

---

## About

ClaúGas lets customers in Buea order cooking gas cylinders for delivery —
pick a cylinder size, choose Cash on Delivery or Mobile Money, and track
the order in real time. Retailers get their own dashboard to accept and
fulfil orders. Built to eventually grow from a single-retailer app into a
multi-vendor gas delivery marketplace across Cameroon and beyond.

Available in English, French, and Cameroon Pidgin.

## Features

- 📦 Cylinder ordering with live pricing and stock status
- 💳 Cash on Delivery or Mobile Money (via [Campay](https://campay.net))
- 🔔 SMS / WhatsApp order-status notifications (via [Termii](https://termii.com))
- 📍 Delivery pricing by local quarter (Molyko, Great Soppo, GRA, Bonduma, …)
- 🌍 Multi-language: English / Français / Pidgin, with persisted dark mode
- 🧾 Downloadable PDF receipts
- 🛠️ Admin dashboard: cylinder pricing, stock toggles, order management
- 🏪 Retailer dashboard: accept/reject incoming orders (marketplace foundation)
- 🔐 Row-level security on every table; server-side price enforcement so
  order totals can never be tampered with client-side
- 🩺 Error monitoring via [Sentry](https://sentry.io)

## Tech stack

| Layer      | Choice |
|------------|--------|
| Framework  | [TanStack Start](https://tanstack.com/start) (React, SSR) + TanStack Router |
| Styling    | Tailwind CSS + shadcn/ui |
| Backend    | [Supabase](https://supabase.com) (Postgres, Auth, RLS, Edge Functions, Realtime) |
| Payments   | Campay (Mobile Money collection) |
| Notifications | Termii (SMS/WhatsApp) + Resend (email), both via Postgres triggers |
| i18n       | i18next / react-i18next |
| Monitoring | Sentry |
| Hosting    | Vercel |

## Getting started

```bash
git clone https://github.com/Agbor-Clauvet/claugasBuea-Hub.git
cd claugasBuea-Hub
npm install
cp .env.example .env   # then fill in your own Supabase project values
npm run dev
```

The app runs at `http://localhost:8080`.

### Environment variables

See [`.env.example`](.env.example) for the frontend variables. The Supabase
Edge Functions (`campay-initiate`, `campay-webhook`) need their own secrets,
set via the Supabase CLI rather than a `.env` file:

```bash
supabase secrets set CAMPAY_PERMANENT_TOKEN=...
supabase secrets set CAMPAY_WEBHOOK_SECRET=...
supabase secrets set CAMPAY_BASE_URL=https://www.campay.net
```

### Database

Schema and RLS policies live in [`supabase/migrations`](supabase/migrations).
Apply them to a fresh Supabase project with:

```bash
supabase db push
```

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also runs on `git push` via a pre-push hook) |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Project structure

```
src/
  routes/            TanStack Router file-based routes (pages)
  components/         Shared UI (layout, shadcn primitives)
  integrations/supabase/  Supabase client setup (browser + server)
  i18n/               Translations (en / fr / pcm)
  lib/                Shared helpers (pricing, tracking numbers, etc.)
supabase/
  functions/          Edge Functions (Campay payment integration)
  migrations/         Database schema + RLS policies, in order
docs/                 Architecture and scalability notes
```

## Security

RLS is enabled on every table; order pricing is recomputed and locked
server-side so it can never be manipulated from the client. See
[`SECURITY.md`](SECURITY.md) for how to report a vulnerability.

## License

All rights reserved — see [`LICENSE`](LICENSE). This repo is public for
transparency and portfolio purposes; it is not licensed for reuse.

## Author

Built by [Clauvet](https://github.com/Agbor-Clauvet) · ClauTech Digital
Solutions · Buea, Cameroon.
