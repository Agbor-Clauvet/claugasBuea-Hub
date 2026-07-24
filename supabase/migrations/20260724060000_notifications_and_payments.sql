-- ============================================================
-- ClaúGas: Campay payments + Termii SMS/WhatsApp notifications
--
-- Mirrors the existing pattern in
-- 20260719090000_order_email_notifications.sql: triggers call
-- Termii directly via pg_net (already enabled), reading the API
-- key from Supabase's secrets vault. No Edge Function needed for
-- sending — only Campay's initiate + webhook need Edge Functions,
-- because those need to talk back to the frontend / receive an
-- inbound HTTP call.
--
-- After running this migration, set the Termii key once, directly
-- in the SQL Editor (do not commit it to a file):
--
--   select vault.create_secret('YOUR_REAL_TERMII_API_KEY', 'termii_api_key');
--   select vault.create_secret('YOUR_TERMII_SENDER_ID', 'termii_sender_id');
--
-- Until those are set, these triggers no-op — same safe-by-default
-- behaviour as the email trigger.
-- ============================================================

-- ---------- payment_transactions (Campay) ----------
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  campay_reference text unique,
  external_reference text not null unique,
  amount numeric(10, 2) not null,
  currency text not null default 'XAF',
  operator text,                     -- MTN / ORANGE, filled in by webhook
  phone_number text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED')),
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_transactions_order_id on public.payment_transactions (order_id);
create index if not exists idx_payment_transactions_status on public.payment_transactions (status);

grant select, insert, update on public.payment_transactions to authenticated;
grant all on public.payment_transactions to service_role;

alter table public.payment_transactions enable row level security;

create policy "customers read own payment transactions"
  on public.payment_transactions for select to authenticated
  using (order_id in (select id from public.orders where customer_id = auth.uid()));

create trigger trg_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.update_updated_at_column();

-- ---------- notifications (history/audit log, not a queue) ----------
-- Written right before firing the pg_net request, so you always have a
-- record of what was attempted even though pg_net itself is fire-and-forget.
-- A future Django service can read this table directly for reporting, or
-- reuse pg_net + vault the same way from its own triggers/tasks.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  recipient_phone text not null,
  channel text not null check (channel in ('sms', 'whatsapp')),
  template text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_order_id on public.notifications (order_id);

grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;

alter table public.notifications enable row level security;

create policy "customers read own order notifications"
  on public.notifications for select to authenticated
  using (order_id in (select id from public.orders where customer_id = auth.uid()));

-- ---------- shared helper: send via Termii using pg_net + vault ----------
create or replace function public.send_termii_message(
  p_order_id uuid,
  p_recipient_phone text,
  p_channel text,       -- 'sms' or 'whatsapp'
  p_template text,
  p_message text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_api_key text;
  v_sender_id text;
  v_endpoint text;
  v_body jsonb;
begin
  select decrypted_secret into v_api_key from vault.decrypted_secrets where name = 'termii_api_key' limit 1;
  select decrypted_secret into v_sender_id from vault.decrypted_secrets where name = 'termii_sender_id' limit 1;

  if v_api_key is null or v_sender_id is null then
    return; -- secrets not set up yet; no-op, doesn't block the order (same as email trigger)
  end if;

  if p_channel = 'whatsapp' then
    v_endpoint := 'https://api.ng.termii.com/api/whatsapp/send';
    -- NOTE: verify this endpoint/body shape against your current Termii
    -- dashboard docs — their WhatsApp API is newer than SMS and may need
    -- an approved template name/ID instead of free-form text.
    v_body := jsonb_build_object(
      'api_key', v_api_key,
      'to', p_recipient_phone,
      'from', v_sender_id,
      'sms', p_message,
      'type', 'plain',
      'channel', 'whatsapp'
    );
  else
    v_endpoint := 'https://api.ng.termii.com/api/sms/send';
    v_body := jsonb_build_object(
      'api_key', v_api_key,
      'to', p_recipient_phone,
      'from', v_sender_id,
      'sms', p_message,
      'type', 'plain',
      'channel', 'generic'
    );
  end if;

  insert into public.notifications (order_id, recipient_phone, channel, template, message)
  values (p_order_id, p_recipient_phone, p_channel, p_template, p_message);

  perform net.http_post(
    url := v_endpoint,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := v_body
  );
end;
$$;

-- ---------- trigger: customer SMS/WhatsApp on order status change ----------
create or replace function public.notify_order_status_sms_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_phone text;
  v_order_code text;
  v_status_label text;
  v_quantity int;
  v_message text;
  v_should_notify boolean := false;
begin
  if TG_OP = 'INSERT' then
    v_should_notify := true;
  elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then
    v_should_notify := true;
  end if;

  if not v_should_notify then
    return NEW;
  end if;

  select phone into v_customer_phone from public.profiles where id = NEW.customer_id;
  if v_customer_phone is null then
    return NEW; -- no phone on file, can't text them
  end if;

  v_order_code := 'CG-' || upper(left(replace(NEW.id::text, '-', ''), 8));
  select coalesce(sum(quantity), 0) into v_quantity from public.order_items where order_id = NEW.id;

  v_status_label := case NEW.status::text
    when 'pending' then 'placed'
    when 'confirmed' then 'confirmed'
    when 'assigned' then 'confirmed'
    when 'in_transit' then 'out for delivery'
    when 'delivered' then 'delivered'
    when 'cancelled' then 'cancelled'
    else NEW.status::text
  end;

  v_message := 'ClaúGas: Order ' || v_order_code || ' (' || v_quantity || ' cylinder(s)) is ' ||
    v_status_label || '. Total: ' || to_char(NEW.total, 'FM999,999,999') || ' XAF.';

  perform public.send_termii_message(NEW.id, v_customer_phone, 'sms', 'order_status_' || NEW.status::text, v_message);

  return NEW;
end;
$$;

drop trigger if exists trg_order_notify_sms_whatsapp on public.orders;
create trigger trg_order_notify_sms_whatsapp
after insert or update on public.orders
for each row
execute function public.notify_order_status_sms_whatsapp();

-- ---------- trigger: retailer SMS when an order is confirmed ----------
-- Fires on 'confirmed' rather than the initial 'pending' insert, so
-- retailers aren't pinged for an order that hasn't actually gone through
-- yet (still matters for cash-on-delivery orders, which go straight to
-- 'confirmed' without touching Campay at all).
create or replace function public.notify_retailer_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retailer_phone text;
  v_order_code text;
  v_quantity int;
  v_address text;
  v_message text;
begin
  if NEW.retailer_id is null then
    return NEW;
  end if;

  if not (TG_OP = 'UPDATE' and NEW.status = 'confirmed' and OLD.status is distinct from NEW.status) then
    return NEW;
  end if;

  select phone into v_retailer_phone from public.retailers where id = NEW.retailer_id;
  if v_retailer_phone is null then
    return NEW;
  end if;

  v_order_code := 'CG-' || upper(left(replace(NEW.id::text, '-', ''), 8));
  select coalesce(sum(quantity), 0) into v_quantity from public.order_items where order_id = NEW.id;
  select line1 || ', ' || city into v_address from public.addresses where id = NEW.address_id;

  v_message := 'ClaúGas: New order ' || v_order_code || ' — ' || v_quantity || ' cylinder(s), ' ||
    to_char(NEW.total, 'FM999,999,999') || ' XAF. Deliver to ' || coalesce(v_address, 'address on file') ||
    '. Check your dashboard to accept.';

  perform public.send_termii_message(NEW.id, v_retailer_phone, 'sms', 'retailer_new_order', v_message);

  return NEW;
end;
$$;

drop trigger if exists trg_order_notify_retailer on public.orders;
create trigger trg_order_notify_retailer
after update on public.orders
for each row
execute function public.notify_retailer_new_order();

comment on table public.payment_transactions is
  'Source of truth for Campay Mobile Money collections. Written by campay-initiate, updated by campay-webhook.';
comment on table public.notifications is
  'Audit log of every SMS/WhatsApp sent via Termii. Written by send_termii_message() right before the pg_net call.';
