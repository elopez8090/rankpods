import { randomBytes } from "node:crypto";

const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LENGTH = 32;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PodcastRow = {
  id: string;
  name: string | null;
  creator_email: string | null;
};

export type CreatorSessionRow = {
  id: string;
  podcast_id: string;
  email: string;
  token: string;
  expires_at: string;
  created_at: string;
};

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

export function generateMagicToken(length = TOKEN_LENGTH) {
  const bytes = randomBytes(length);
  let token = "";

  for (let i = 0; i < length; i += 1) {
    token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }

  return token;
}

export function sessionExpiryIso(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function isExpired(expiresAt: string, now = Date.now()) {
  const expiry = Date.parse(expiresAt);
  return !Number.isFinite(expiry) || expiry <= now;
}

export const CREATOR_SESSION_COOKIE = "rankpods_creator_session";
export const CREATOR_SESSION_MAX_AGE = 86400 * 7;

export type CreatorSessionCookie = {
  podcastId: string;
  email: string;
};

export function serializeCreatorSessionCookie(session: CreatorSessionCookie) {
  return JSON.stringify({
    podcastId: session.podcastId,
    email: session.email,
  });
}

export function parseCreatorSessionCookie(
  value: string | undefined | null
): CreatorSessionCookie | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;

    const row = parsed as Record<string, unknown>;
    const podcastId = typeof row.podcastId === "string" ? row.podcastId.trim() : "";
    const email = typeof row.email === "string" ? row.email.trim() : "";

    if (!podcastId || !email) return null;

    return { podcastId, email };
  } catch {
    return null;
  }
}

export function isSecureCookieRequest(request: {
  headers: Headers;
  nextUrl?: URL;
}) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl?.host ||
    "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return false;
  }

  const proto = (
    request.headers.get("x-forwarded-proto") ||
    request.nextUrl?.protocol.replace(":", "") ||
    ""
  ).toLowerCase();

  return proto === "https" || process.env.NODE_ENV === "production";
}

export function isPodcastRow(value: unknown): value is PodcastRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    (row.name === null || typeof row.name === "string" || row.name === undefined) &&
    (row.creator_email === null ||
      typeof row.creator_email === "string" ||
      row.creator_email === undefined)
  );
}

export function isCreatorSessionRow(value: unknown): value is CreatorSessionRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.podcast_id === "string" &&
    typeof row.email === "string" &&
    typeof row.token === "string" &&
    typeof row.expires_at === "string" &&
    typeof row.created_at === "string"
  );
}

export function normalizePodcastUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function magicLinkEmailHtml(input: {
  podcastName: string;
  magicLink: string;
}) {
  const podcastName = escapeHtml(input.podcastName);
  const magicLink = escapeHtml(input.magicLink);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your RankPods Dashboard Link</title>
  </head>
  <body style="margin:0;padding:0;background-color:#020617;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#020617;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 8px;text-align:left;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#34d399;">RankPods</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#f8fafc;">Your dashboard link is ready</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cbd5e1;">
                  Sign in to manage <strong style="color:#f8fafc;">${podcastName}</strong> on the RankPods creator dashboard. This link expires in 24 hours.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${magicLink}" style="display:inline-block;background-color:#10b981;color:#022c22;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">
                    Open creator dashboard
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#94a3b8;">
                  If the button does not work, copy and paste this URL into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;">
                  <a href="${magicLink}" style="color:#34d399;">${magicLink}</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  If you did not request this email, you can ignore it. The link will expire automatically after 24 hours.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font-size:12px;color:#475569;">
                RankPods · The leaderboard for tech &amp; startup podcasts
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
