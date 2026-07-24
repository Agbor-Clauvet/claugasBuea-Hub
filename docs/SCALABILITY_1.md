# ClaúGas — Campay Payments & Termii SMS/WhatsApp

Built to match your existing `20260719090000_order_email_notifications.sql`
pattern: a DB trigger calls the provider directly via `pg_net`, reading the
API key from Supabase's vault. No extra Edge Function, no cron job, no
polling — it happens in the same transaction your order update already runs.

## What's here

- `supabase/migrations/20260723_notifications_and_payments.sql`
  - `payment_transactions` — source of truth for Campay collections
  - `notifications` — audit log of every SMS/WhatsApp sent (not a queue —
    sending is synchronous via trigger, same as your email one)
  - `send_termii_message()` — shared helper, calls Termii via `pg_net`
  - `trg_order_notify_sms_whatsapp` — texts the customer on every order
    status change (placed, confirmed, out for delivery, delivered, cancelled)
  - `trg_order_notify_retailer` — texts the retailer once an order flips to
    `confirmed` (works for both cash-on-delivery and Mobile Money orders)
- `supabase/functions/campay-initiate` — starts a Mobile Money collection.
  Pulls the amount from the `orders` row server-side (never trusts the
  frontend for that) and checks the caller actually owns the order.
- `supabase/functions/campay-webhook` — receives Campay's result, updates
  `payment_transactions`, and on success flips `orders.status` to
  `'confirmed'`. That single update is what fires your SMS/WhatsApp/email
  triggers automatically — the webhook itself sends nothing.

## Why this is "Django-ready" without a Django service yet

The contract is the database, not the code sending the request:
- Payment state lives in `payment_transactions` / `orders.status`
- Notification history lives in `notifications`
- Whoever calls `send_termii_message()` — a Postgres trigger today, a
  Django/Celery task tomorrow — doesn't change the tables or the frontend

When you're ready to bring in Django (e.g. once you need heavier business
logic than triggers comfortably handle — multi-vendor order routing,
scheduled retries, background jobs), you can:
1. Point Django at the same Postgres database
2. Move `campay-webhook`'s logic into a Django view at the same URL (Campay
   just POSTs to a URL, it doesn't care what's behind it)
3. Either keep the triggers as-is, or move that logic into Django signals /
   Celery tasks that call Termii the same way — one piece at a time, no
   forced rewrite.

## Setup checklist

1. Run the migration:
   ```
   supabase db push
   ```
2. Set secrets **directly in the Supabase SQL Editor** (matches how you
   already handle `resend_api_key` — don't commit these to a file):
   ```sql
   select vault.create_secret('YOUR_REAL_TERMII_API_KEY', 'termii_api_key');
   select vault.create_secret('YOUR_TERMII_SENDER_ID', 'termii_sender_id');
   ```
3. Set Edge Function secrets for Campay (`supabase secrets set KEY=value` or
   via Dashboard → Edge Functions → Secrets):
   - `CAMPAY_PERMANENT_TOKEN` — from your Campay dashboard
   - `CAMPAY_BASE_URL` — sandbox: `https://demo.campay.net`, production:
     `https://www.campay.net`
   - `CAMPAY_WEBHOOK_SECRET` — any string you generate yourself
   - `SUPABASE_ANON_KEY` — needed by `campay-initiate` to verify the caller's
     session (this is usually already set by default in Supabase Edge
     Function environments — check before adding it manually)
4. Deploy:
   ```
   supabase functions deploy campay-initiate
   supabase functions deploy campay-webhook
   ```
5. In Campay's dashboard, set the webhook URL to your deployed
   `campay-webhook` URL with `?key=<CAMPAY_WEBHOOK_SECRET>` appended.
6. Before going live, double-check against current docs:
   - **Termii WhatsApp**: the endpoint/body shape in `send_termii_message()`
     is flagged in a comment — Termii's WhatsApp API is newer than SMS and
     commonly requires an approved message template rather than free text.
   - **Campay's webhook payload**: field names (`reference`,
     `external_reference`, `status`, `operator`) match Campay's documented
     shape but confirm against a real payload in your dashboard's webhook
     logs before trusting it in production.

## Frontend checkout wiring (next step)

`campay-initiate` expects `{ orderId, phoneNumber }` in the request body and
an `Authorization: Bearer <session token>` header (same one your Supabase
client already attaches to other authenticated calls). On success it
returns `{ reference, externalReference, status: "PENDING", message }` —
show that message and let the customer approve the USSD prompt on their
phone; `campay-webhook` handles the rest server-side.
