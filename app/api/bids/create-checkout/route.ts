import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import {
  CREATOR_SESSION_COOKIE,
  parseCreatorSessionCookie,
} from "@/lib/creator-auth";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "Tech",
  "Startups",
  "AI",
  "Founders",
  "Indie Makers",
] as const;

type Category = (typeof CATEGORIES)[number];

const SPONSOR_LOGO_BUCKET = "sponsor-logos";

type CheckoutBody = {
  name?: unknown;
  url?: unknown;
  email?: unknown;
  amount?: unknown;
  description?: unknown;
  category?: unknown;
  podcastId?: unknown;
};

type ParsedCheckoutRequest = {
  body: CheckoutBody;
  sponsorLogo: File | null;
};

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function asTrimmedString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asSponsorLogoFile(value: FormDataEntryValue | null): File | null {
  if (!(value instanceof File) || value.size <= 0) return null;
  return value;
}

function sponsorLogoStoragePath(filename: string) {
  const safeName = filename.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "") || "logo";
  return `sponsor-logos/${Date.now()}-${safeName}`;
}

async function uploadSponsorLogo(
  file: File
): Promise<{ url: string } | { error: string }> {
  const storagePath = sponsorLogoStoragePath(file.name);

  try {
    const { error: uploadError } = await supabase.storage
      .from(SPONSOR_LOGO_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return {
        error: uploadError.message || "Unable to upload sponsor logo.",
      };
    }

    const { data } = supabase.storage
      .from(SPONSOR_LOGO_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = data.publicUrl?.trim();
    if (!publicUrl) {
      return { error: "Unable to get a public URL for the sponsor logo." };
    }

    return { url: publicUrl };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to upload sponsor logo.",
    };
  }
}

async function parseCheckoutBody(
  request: NextRequest
): Promise<ParsedCheckoutRequest> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      body: {
        name: form.get("name") ?? undefined,
        url: form.get("url") ?? undefined,
        email: form.get("email") ?? undefined,
        amount: form.get("amount") ?? undefined,
        description: form.get("description") ?? undefined,
        category: form.get("category") ?? undefined,
        podcastId: form.get("podcastId") ?? undefined,
      },
      sponsorLogo: asSponsorLogoFile(form.get("sponsorLogo")),
    };
  }

  return {
    body: (await request.json()) as CheckoutBody,
    sponsorLogo: null,
  };
}

function getAppUrl(request: NextRequest) {
  const fromEnv = (
    process.env.YOUR_DOMAIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ""
  ).replace(/\/$/, "");

  if (fromEnv) return fromEnv;

  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";

  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  let body: CheckoutBody;
  let sponsorLogo: File | null = null;

  try {
    const parsed = await parseCheckoutBody(request);
    body = parsed.body;
    sponsorLogo = parsed.sponsorLogo;
  } catch {
    return jsonError(400, "Invalid request body.");
  }

  const name = asTrimmedString(body.name);
  const url = asTrimmedString(body.url);
  const email = asTrimmedString(body.email);
  const description = asTrimmedString(body.description);
  const categoryInput = asTrimmedString(body.category);
  const existingPodcastId = asTrimmedString(body.podcastId);
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount < 5) {
    return jsonError(400, "Amount must be at least $5.");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return jsonError(500, "Missing STRIPE_SECRET_KEY environment variable.");
  }

  let podcastId: string;
  let podcastName: string;
  let customerEmail: string;

  if (existingPodcastId) {
    const cookieStore = await cookies();
    const session = parseCreatorSessionCookie(
      cookieStore.get(CREATOR_SESSION_COOKIE)?.value
    );

    if (!session || session.podcastId !== existingPodcastId) {
      return jsonError(
        401,
        "You must be signed in as this podcast's creator to add bids."
      );
    }

    const { data: existing, error: lookupError } = await supabase
      .from("podcasts")
      .select("id, name, creator_email")
      .eq("id", existingPodcastId)
      .maybeSingle();

    if (lookupError) {
      return jsonError(
        500,
        lookupError.message || "Unable to look up podcast."
      );
    }

    if (!existing?.id) {
      return jsonError(404, "Podcast not found.");
    }

    podcastId = String(existing.id);
    podcastName = asTrimmedString(existing.name) || "Untitled podcast";
    customerEmail = asTrimmedString(existing.creator_email) || session.email;
  } else {
    if (!name || !url || !email) {
      return jsonError(400, "name, url, and email are required.");
    }

    if (categoryInput && !isCategory(categoryInput)) {
      return jsonError(
        400,
        "category must be one of: Tech, Startups, AI, Founders, Indie Makers."
      );
    }

    const category: Category = isCategory(categoryInput)
      ? categoryInput
      : "Tech";

    let sponsorLogoUrl: string | null = null;
    if (sponsorLogo) {
      const uploaded = await uploadSponsorLogo(sponsorLogo);
      if ("error" in uploaded) {
        return jsonError(
          500,
          uploaded.error || "Unable to upload sponsor logo."
        );
      }
      sponsorLogoUrl = uploaded.url;
    }

    const { data: podcast, error: insertError } = await supabase
      .from("podcasts")
      .insert({
        name,
        podcast_url: url,
        creator_email: email,
        description: description || null,
        category,
        sponsor_logo_url: sponsorLogoUrl,
      })
      .select("id")
      .single();

    if (insertError || !podcast?.id) {
      return jsonError(
        500,
        insertError?.message || "Unable to create podcast."
      );
    }

    podcastId = String(podcast.id);
    podcastName = name;
    customerEmail = email;
  }

  const appUrl = getAppUrl(request);
  const amountInCents = Math.round(amount * 100);

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountInCents,
            product_data: {
              name: `Podcast Bid - ${podcastName}`,
              description: `Podcast Bid - ${podcastName}`,
            },
          },
        },
      ],
      success_url: `${appUrl}/success?podcast_id=${encodeURIComponent(podcastId)}`,
      cancel_url: `${appUrl}${existingPodcastId ? "/dashboard" : "/submit"}`,
      metadata: {
        podcast_id: podcastId,
        amount: String(Math.round(amount)),
      },
      payment_intent_data: {
        metadata: {
          podcast_id: podcastId,
          amount: String(Math.round(amount)),
        },
      },
    });

    if (!session.url) {
      return jsonError(500, "Stripe did not return a checkout URL.");
    }

    return Response.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create checkout session.";
    return jsonError(500, message);
  }
}
