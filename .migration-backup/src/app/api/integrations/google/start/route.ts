import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { createOauthState, getGoogleOauthConfig, setOauthStateCookie } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  try {
    await requireCurrentUser();
    const origin = request.nextUrl.origin;
    const { clientId, redirectUri } = getGoogleOauthConfig(origin);
    const state = createOauthState();
    await setOauthStateCookie("google", state);

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/gmail.send");
    url.searchParams.set("state", state);

    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL("/settings", request.nextUrl.origin);
    url.searchParams.set("error", error instanceof Error ? error.message : "Could not start Google OAuth.");
    return NextResponse.redirect(url);
  }
}
