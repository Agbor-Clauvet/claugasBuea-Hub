// campay-initiate
//
// Called from checkout once a customer picks Mobile Money as payment.
// Creates a payment_transactions row (status=PENDING) then asks Campay
// to push a USSD payment prompt to the customer's phone. The customer
// approves on their phone; Campay tells us the result via campay-webhook.
//
// The amount is NEVER trusted from the frontend — it's read straight off
// the order row server-side, so a tampered client request can't pay a
// different amount than what's actually owed.
//
// Verify CAMPAY_BASE_URL, auth header format, and field names against
// your current Campay dashboard docs before going live — payment
// aggregator APIs change their exact contract more often than you'd like.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CAMPAY_BASE_URL = Deno.env.get("CAMPAY_BASE_URL") ?? "https://www.campay.net";
const CAMPAY_PERMANENT_TOKEN = Deno.env.get("CAMPAY_PERMANENT_TOKEN")!; // from Campay dashboard

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId, phoneNumber, description } = await req.json();

    if (!orderId || !phoneNumber) {
      return new Response(JSON.stringify({ error: "orderId, phoneNumber required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Authenticate the caller (forwarded from the frontend's Supabase session)
    // and make sure they actually own this order before we charge anything.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing Authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "invalid session" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, total, payment_method, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "order not found" }), { status: 404, headers: corsHeaders });
    }
    if (order.customer_id !== user.id) {
      return new Response(JSON.stringify({ error: "not your order" }), { status: 403, headers: corsHeaders });
    }
    if (order.payment_method !== "mobile_money") {
      return new Response(JSON.stringify({ error: "order is not set to mobile_money payment" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const amount = order.total;
    const externalReference = `claugas-${orderId}-${Date.now()}`;

    // Create the local record first — this is our idempotency anchor even
    // if the Campay call itself fails or times out.
    const { error: insertError } = await supabase.from("payment_transactions").insert({
      order_id: orderId,
      external_reference: externalReference,
      amount,
      currency: "XAF",
      phone_number: phoneNumber,
      status: "PENDING",
    });
    if (insertError) throw insertError;

    const campayRes = await fetch(`${CAMPAY_BASE_URL}/api/collect/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${CAMPAY_PERMANENT_TOKEN}`,
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: "XAF",
        from: phoneNumber, // format: 2376XXXXXXXX
        description: description ?? "ClaúGas order payment",
        external_reference: externalReference,
      }),
    });

    const campayData = await campayRes.json();

    if (!campayRes.ok || !campayData?.reference) {
      await supabase
        .from("payment_transactions")
        .update({ status: "FAILED", raw_webhook_payload: campayData })
        .eq("external_reference", externalReference);

      return new Response(JSON.stringify({ error: "Campay initiation failed", detail: campayData }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    await supabase
      .from("payment_transactions")
      .update({ campay_reference: campayData.reference })
      .eq("external_reference", externalReference);

    return new Response(
      JSON.stringify({
        reference: campayData.reference,
        externalReference,
        status: "PENDING",
        message: "Payment prompt sent to your phone — approve it to complete the order.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
