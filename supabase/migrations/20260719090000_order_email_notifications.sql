-- =========================================================
-- ORDER EMAIL NOTIFICATIONS (additive, non-breaking)
--
-- Sends an email to the customer automatically whenever:
--   - they place a new order, or
--   - the order's status changes (Confirmed, Out for Delivery, etc.)
--
-- Uses pg_net (built into Supabase) to call the Resend email API
-- directly from a database trigger — no Edge Function, no Vercel
-- API route, no extra deployment step needed.
--
-- SECURITY NOTE: this file is committed to a PUBLIC repo, so it
-- deliberately contains NO API key. The Resend API key is read at
-- runtime from Supabase's built-in secrets vault. After running
-- this migration, you still need to run ONE more command yourself,
-- directly in the SQL Editor (do not commit it to a file):
--
--   select vault.create_secret('YOUR_REAL_RESEND_API_KEY', 'resend_api_key');
--
-- Until that's run, this trigger simply no-ops (no email sent, no
-- error, no impact on placing/updating orders).
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_order_status_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_email TEXT;
  api_key TEXT;
  status_label TEXT;
  subject TEXT;
  body_html TEXT;
  should_notify BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    should_notify := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    should_notify := true;
  END IF;

  IF NOT should_notify THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO api_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key' LIMIT 1;
  IF api_key IS NULL THEN
    RETURN NEW; -- vault secret not set up yet; no-op, doesn't block the order
  END IF;

  SELECT email INTO customer_email FROM auth.users WHERE id = NEW.customer_id;
  IF customer_email IS NULL THEN
    RETURN NEW;
  END IF;

  status_label := CASE NEW.status::text
    WHEN 'pending' THEN 'Order Placed'
    WHEN 'confirmed' THEN 'Confirmed'
    WHEN 'assigned' THEN 'Confirmed'
    WHEN 'in_transit' THEN 'Out for Delivery'
    WHEN 'delivered' THEN 'Delivered'
    WHEN 'cancelled' THEN 'Cancelled'
    ELSE NEW.status::text
  END;

  subject := 'ClauGas order ' || status_label;
  body_html :=
    '<div style="font-family:sans-serif;font-size:15px;color:#111">' ||
    '<p>Hi,</p>' ||
    '<p>Your ClauGas order <strong>CG-' || upper(left(replace(NEW.id::text, '-', ''), 8)) ||
      '</strong> is now <strong>' || status_label || '</strong>.</p>' ||
    '<p>Total: <strong>' || to_char(NEW.total, 'FM999,999,999') || ' XAF</strong></p>' ||
    '<p><a href="https://claugas-foundation.vercel.app/orders/' || NEW.id ||
      '" style="color:#2563eb">Track your order</a></p>' ||
    '<p style="color:#666;font-size:13px">Thank you for choosing ClauGas.</p>' ||
    '</div>';

  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'ClauGas <onboarding@resend.dev>',
      'to', jsonb_build_array(customer_email),
      'subject', subject,
      'html', body_html
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_notify_email ON public.orders;
CREATE TRIGGER trg_order_notify_email
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_email();
