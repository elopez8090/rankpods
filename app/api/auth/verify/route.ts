import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { asTrimmedString, jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  CREATOR_SESSION_COOKIE,
  CREATOR_SESSION_MAX_AGE,
  isCreatorSessionRow,
  isExpired,
  isSecureCookieRequest,
  serializeCreatorSessionCookie,
} from "@/lib/creator-auth";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const TOKEN_PATTERN = /^[A-Za-z0-9]{32}$/;

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonError(400, "Invalid JSON body.");
  }

  const token = asTrimmedString(parsed.body.token);

  if (!token) {
    return jsonError(400, "token is required.");
  }

  if (!TOKEN_PATTERN.test(token)) {
    return jsonError(400, "Link expired or invalid");
  }

  const { data, error } = await supabase
    .from("creator_sessions")
    .select("id, podcast_id, email, token, expires_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return jsonError(500, error.message || "Unable to verify magic link.");
  }

  if (!isCreatorSessionRow(data) || isExpired(data.expires_at)) {
    return jsonError(400, "Link expired or invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    CREATOR_SESSION_COOKIE,
    serializeCreatorSessionCookie({
      podcastId: data.podcast_id,
      email: data.email,
    }),
    {
      httpOnly: true,
      secure: isSecureCookieRequest(request),
      sameSite: "lax",
      maxAge: CREATOR_SESSION_MAX_AGE,
      path: "/",
    }
  );

  return jsonOk({
    success: true as const,
    podcastId: data.podcast_id,
    email: data.email,
  });
}
