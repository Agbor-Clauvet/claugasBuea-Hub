
# Stage 3 — Cylinder Booking Flow (LPG-style) + QA

Scope is intentionally additive: no changes to existing tables, RLS, cart, or checkout for non-cylinder products. New capability is layered on the existing `cylinders` + `orders` + `order_items` tables.

## 1. Assets — real cylinder images
Upload the 3 uploaded photos (green / red / yellow 12.5kg) as Lovable Assets and wire their public URLs into the `cylinders` rows via a data migration (UPDATE only, no schema change). Home page + product cards will automatically pick them up (they already render `image_url`).

## 2. Database — additive only
One migration adds:
- `orders.order_type` text default `'standard'` (values: `standard` | `cylinder_booking`) — no backfill needed, defaults keep old rows valid.
- `orders.consumer_number` text nullable — LPG-style consumer ID.
- `orders.preferred_delivery_date` date nullable.
- `orders.address_id` uuid nullable → `addresses(id)`.
- Extend `orders.status` allowed values (already free text or enum — will check) to include: `placed`, `confirmed`, `out_for_delivery`, `delivered`, `cancelled`. If enum, ALTER TYPE ADD VALUE. No existing rows touched.
- Address edit/delete: RLS on `addresses` already covers owner; add UPDATE + DELETE policies if missing (read-only additive).

No changes to `cylinders`, `order_items`, `profiles`, `user_roles`, `service_areas`.

## 3. Admin — Cylinder Pricing manager
New route `src/routes/_authenticated/admin/cylinders.tsx` (gated by `has_role('admin')`):
- Lists all cylinders, inline edit price + in_stock toggle.
- Uses existing supabase update on `cylinders` table.
- Link visible in dashboard only when admin.

## 4. Customer — Book Refill flow
- On home + a new `/products` route, cylinders render with **Book Refill** CTA instead of Add to Cart (since this whole catalog IS cylinders, all items get the booking flow — matches spec: "for the 12.5kg cylinder product").
- New route `/_authenticated/book/$cylinderId`:
  - Shows cylinder + current price.
  - Form: pick saved address (from addresses table) OR add new, consumer number (optional), preferred delivery date.
  - Submit → inserts one `orders` row (`order_type='cylinder_booking'`, `status='placed'`, snapshot price into `total`) + one `order_items` row.
  - Redirects to `/orders/:id`.

## 5. Order tracking + history
- New route `/_authenticated/orders` (My Orders): tabs `All | Cylinder Bookings | Other`, filter by `order_type`. Shows status pill + preferred delivery date.
- New route `/_authenticated/orders/$id`: status stepper (Placed → Confirmed → Out for Delivery → Delivered), address, consumer #, ETA.
- Admin route `/_authenticated/admin/orders`: update order status (advances stepper). Uses existing orders RLS + admin role.

## 6. Address edit/delete
Extend existing `src/routes/_authenticated/addresses.tsx`:
- Edit button opens the same form pre-filled → UPDATE.
- Delete already present — confirm dialog added.
- Enforce quarter is required (already required in `<select required>`, verified).

## 7. i18n
Add EN/FR/PCM keys for: booking form, order tracking, admin, filters, status labels.

## 8. QA
- Playwright script (`/tmp/browser/stage3/`): sign-in as seeded user, book refill, view order, filter tab.
- Supabase RLS check via `supabase--read_query`: list policies on `orders`, `order_items`, `addresses`, `cylinders`, `service_areas`, `user_roles`, `profiles`. Report gaps, don't silently rewrite.
- Confirm phone verification UI on auth page (already present from Stage 2 — will just re-screenshot).

## Files (new)
- `src/routes/_authenticated/admin/cylinders.tsx`
- `src/routes/_authenticated/admin/orders.tsx`
- `src/routes/_authenticated/book.$cylinderId.tsx`
- `src/routes/_authenticated/orders.tsx`
- `src/routes/_authenticated/orders.$id.tsx`
- `src/lib/order-status.ts` (shared status labels/colors)
- Migration file (via supabase--migration)
- 3 asset pointer JSONs for real cylinder photos

## Files (edited)
- `src/routes/index.tsx` — Book Refill CTA, use real images (already reads `image_url`).
- `src/routes/_authenticated/addresses.tsx` — edit mode.
- `src/routes/_authenticated/dashboard.tsx` — links to Orders / Admin.
- `src/i18n/locales/{en,fr,pcm}.json` — new keys.

## Out of scope (deferred to later stages)
- Rider portal, super-admin analytics, PDF receipts, mobile money reconciliation — all Stage 4/5 as previously agreed.

Confirm and I'll ship it in one pass (migration first for approval, then code + QA).
