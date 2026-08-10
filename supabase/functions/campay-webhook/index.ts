// campay-webhook
//
// Configure this URL in your Campay dashboard as the webhook endpoint, e.g.:
//   https://<project-ref>.supabase.co/functions/v1/campay-webhook?key=YOUR_WEBHOOK_SECRET
//
// The ?key= query param is a simple shared-secret check (Campay doesn't
// require this, but appending one to the URL you register is the easiest
// way to make sure random requests can't fake a "payment successful" call).
// Set CAMPAY_WEBHOOK_SECRET to whatever you put after ?key=.
//
// On success this ONLY does two things: update payment_transactions, and
// flip orders.status to 'confirmed'. It does NOT send any SMS/WhatsApp/email
// itself — that's handled automatically by the existing DB triggers
// (trg_order_notify_sms_whatsapp, trg_order_notify_retailer,
// trg_order_notify_email) the moment orders.status changes. One less place
// for notification logic to drift out of sync.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CAMPAY_WEBHOOK_SECRET = Deno.env.get("CAMPAY_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (CAMPAY_WEBHOOK_SECRET && url.searchParams.get("key") !== CAMPAY_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await req.json();
    // Confirm these exact field names against a real Campay webhook payload
    // in your dashboard's webhook logs — this matches Campay's documented
    // collection webhook shape but aggregators do tweak fields over time.
    const { reference, external_reference, status, operator } = payload;

    if (!external_reference && !reference) {
      return new Response(JSON.stringify({ error: "missing reference" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: txn, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("id, order_id, status")
      .eq(external_reference ? "external_reference" : "campay_reference", external_reference ?? reference)
      .single();

    if (fetchError || !txn) {
      return new Response(JSON.stringify({ error: "transaction not found" }), { status: 404 });
    }

    // Idempotency: Campay may retry the same webhook — don't double-process.
    if (txn.status !== "PENDING") {
      return new Response(JSON.stringify({ ok: true, note: "already processed" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedStatus =
      status === "SUCCESSFUL" ? "SUCCESSFUL" : status === "FAILED" ? "FAILED" : "CANCELLED";

    await supabase
      .from("payment_transactions")
      .update({
        status: normalizedStatus,
        campay_reference: reference ?? undefined,
        operator: operator ?? null,
        raw_webhook_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.id);

    if (normalizedStatus === "SUCCESSFUL") {
      // This update is what triggers your SMS/WhatsApp + email notifications
      // automatically — see trg_order_notify_sms_whatsapp / trg_order_notify_retailer.
      await supabase.from("orders").update({ status: "confirmed" }).eq("id", txn.order_id);
    }
    // FAILED/CANCELLED: leave the order status alone. Surface the failure
    // in-app (poll payment_transactions or use Supabase Realtime) rather
    // than texting a "payment failed" message that can read like a scam alert.

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
