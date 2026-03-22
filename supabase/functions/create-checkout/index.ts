import Stripe from "https://esm.sh/stripe@13.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const PRICES: Record<string, string> = {
  premium_monthly: Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ?? "price_premium_monthly_id",
  premium_annual: Deno.env.get("STRIPE_PRICE_PREMIUM_ANNUAL") ?? "price_premium_annual_id",
  clinic_monthly: Deno.env.get("STRIPE_PRICE_CLINIC_MONTHLY") ?? "price_clinic_monthly_id",
  clinic_annual: Deno.env.get("STRIPE_PRICE_CLINIC_ANNUAL") ?? "price_clinic_annual_id",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plan, userId, userEmail, billingPeriod } = await req.json();

    const priceKey = `${plan}_${billingPeriod}`;
    const priceId = PRICES[priceKey];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown price key: ${priceKey}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("client_profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    const origin = req.headers.get("origin") ?? "https://localhost:5173";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId, plan },
    };

    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
