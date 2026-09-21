import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import {
  CREATOR_SESSION_COOKIE,
  isSecureCookieRequest,
} from "@/lib/creator-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.get(CREATOR_SESSION_COOKIE);

    cookieStore.set(CREATOR_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: isSecureCookieRequest(request),
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return jsonOk({ success: true as const });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to log out.";
    return jsonError(500, message);
  }
}
