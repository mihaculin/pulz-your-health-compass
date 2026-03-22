import Stripe from "https://esm.sh/stripe@13.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sessionId, userId } = await req.json();

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = (session.metadata?.plan ?? "premium") as "premium" | "clinic";
    const customerId = typeof session.customer === "string" ? session.customer : null;

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    let endDate: string | null = null;

    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      endDate = new Date(sub.current_period_end * 1000).toISOString();
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("client_profiles").update({
      subscription_tier: plan,
      subscription_status: "active",
      stripe_customer_id: customerId,
      subscription_end_date: endDate,
    }).eq("id", userId);

    await supabase.from("payment_events").insert({
      user_id: userId,
      event_type: "checkout.completed",
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amount_cents: session.amount_total,
      currency: session.currency ?? "eur",
      plan,
      status: "paid",
    });

    return new Response(JSON.stringify({ success: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
