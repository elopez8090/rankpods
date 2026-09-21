import { NextRequest } from "next/server";
import { Resend } from "resend";
import { asTrimmedString, jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  generateMagicToken,
  isPodcastRow,
  isValidEmail,
  magicLinkEmailHtml,
  normalizePodcastUrl,
  sessionExpiryIso,
  type PodcastRow,
} from "@/lib/creator-auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const MAGIC_LINK_BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://rankpods.lol") + "/verify";
const PODCAST_COLUMNS = "id, name, creator_email, created_at";

function firstRow<T>(
  data: unknown,
  guard: (value: unknown) => value is T
): T | null {
  if (Array.isArray(data)) {
    const row = data[0];
    return guard(row) ? row : null;
  }
  return guard(data) ? data : null;
}

async function findPodcastByUrl(podcastUrl: string): Promise<
  | { ok: true; podcast: PodcastRow }
  | { ok: false; status: number; error: string }
> {
  const candidates = Array.from(
    new Set([podcastUrl, normalizePodcastUrl(podcastUrl)].filter(Boolean))
  );

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("podcasts")
      .select(PODCAST_COLUMNS)
      .eq("podcast_url", candidate)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return {
        ok: false,
        status: 500,
        error: error.message || "Unable to look up podcast by URL.",
      };
    }

    const podcast = firstRow(data, isPodcastRow);
    if (podcast) return { ok: true, podcast };
  }

  return { ok: false, status: 404, error: "Podcast not found" };
}

async function findPodcastByEmail(email: string): Promise<
  | { ok: true; podcast: PodcastRow }
  | { ok: false; status: number; error: string }
> {
  const sessionResult = await supabase
    .from("creator_sessions")
    .select("podcast_id, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (sessionResult.error) {
    return {
      ok: false,
      status: 500,
      error: sessionResult.error.message || "Unable to look up creator session.",
    };
  }

  const sessionRow = Array.isArray(sessionResult.data)
    ? sessionResult.data[0]
    : sessionResult.data;

  if (
    sessionRow &&
    typeof sessionRow === "object" &&
    "podcast_id" in sessionRow &&
    typeof sessionRow.podcast_id === "string"
  ) {
    const podcastResult = await supabase
      .from("podcasts")
      .select(PODCAST_COLUMNS)
      .eq("id", sessionRow.podcast_id)
      .maybeSingle();

    if (podcastResult.error) {
      return {
        ok: false,
        status: 500,
        error: podcastResult.error.message || "Unable to look up podcast.",
      };
    }

    if (isPodcastRow(podcastResult.data)) {
      return { ok: true, podcast: podcastResult.data };
    }
  }

  const podcastResult = await supabase
    .from("podcasts")
    .select(PODCAST_COLUMNS)
    .eq("creator_email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (podcastResult.error) {
    return {
      ok: false,
      status: 500,
      error: podcastResult.error.message || "Unable to look up podcast by email.",
    };
  }

  const podcast = firstRow(podcastResult.data, isPodcastRow);
  if (podcast) return { ok: true, podcast };

  return { ok: false, status: 404, error: "Podcast not found" };
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError(400, "Invalid JSON body.");
  }

  const podcastUrl = asTrimmedString(parsed.body.podcastUrl);
  const emailInput = asTrimmedString(parsed.body.email).toLowerCase();

  if (!podcastUrl && !emailInput) {
    return jsonError(400, "Provide either podcastUrl or email.");
  }

  if (emailInput && !isValidEmail(emailInput)) {
    return jsonError(400, "email must be a valid email address.");
  }

  const lookup = podcastUrl
    ? await findPodcastByUrl(podcastUrl)
    : await findPodcastByEmail(emailInput);

  if (!lookup.ok) {
    return jsonError(lookup.status, lookup.error);
  }

  const podcast = lookup.podcast;
  const recipient = (
    emailInput || asTrimmedString(podcast.creator_email)
  ).toLowerCase();

  if (!recipient || !isValidEmail(recipient)) {
    return jsonError(
      400,
      "This podcast does not have a valid creator email on file."
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonError(500, "Missing RESEND_API_KEY environment variable.");
  }

  const token = generateMagicToken();
  const expiresAt = sessionExpiryIso(24);
  const createdAt = new Date().toISOString();

  const { error: insertError } = await supabase.from("creator_sessions").insert({
    podcast_id: podcast.id,
    email: recipient,
    token,
    expires_at: expiresAt,
    created_at: createdAt,
  });

  if (insertError) {
    return jsonError(
      500,
      insertError.message || "Unable to create creator session."
    );
  }

  const magicLink = `${MAGIC_LINK_BASE}?token=${encodeURIComponent(token)}`;
  const podcastName = podcast.name?.trim() || "your podcast";
  const from =
    process.env.RESEND_FROM_EMAIL || "RankPods <noreply@rankpods.lol>";

  try {
    const resend = new Resend(apiKey);
    const { error: emailError } = await resend.emails.send({
      from,
      to: recipient,
      subject: "Your RankPods Dashboard Link",
      html: magicLinkEmailHtml({ podcastName, magicLink }),
    });

    if (emailError) {
      return jsonError(
        500,
        emailError.message || "Unable to send magic link email."
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to send magic link email.";
    return jsonError(500, message);
  }

  return jsonOk({
    success: true as const,
    message: "Check your email for the magic link",
  });
}
