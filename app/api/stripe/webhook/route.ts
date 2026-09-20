import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return json(500, {
      error:
        "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET environment variable.",
    });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return json(400, { error: "Missing Stripe-Signature header." });
  }

  const payload = await request.text();
  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook signature verification failed.";
    return json(400, { error: message });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const podcastId = paymentIntent.metadata?.podcast_id;
    const amount = Number.parseInt(String(paymentIntent.metadata?.amount ?? ""), 10);

    if (!podcastId || !Number.isFinite(amount)) {
      return json(500, {
        error: "Missing or invalid podcast_id or amount in payment intent metadata.",
      });
    }

    const { error: insertError } = await supabase.from("bids").insert({
      podcast_id: podcastId,
      amount,
      payment_status: "completed",
      stripe_payment_id: paymentIntent.id,
    });

    if (insertError) {
      return json(500, { error: insertError.message || "Unable to insert bid." });
    }
  }

  return json(200, { received: true });
}
