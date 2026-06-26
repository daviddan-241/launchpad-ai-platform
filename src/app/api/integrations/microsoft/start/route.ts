import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { createOauthState, getMicrosoftOauthConfig, setOauthStateCookie } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  try {
    await requireCurrentUser();
    const origin = request.nextUrl.origin;
    const { clientId, redirectUri } = getMicrosoftOauthConfig(origin);
    const state = createOauthState();
    await setOauthStateCookie("microsoft", state);

    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", "offline_access openid profile email User.Read Mail.Send");
    url.searchParams.set("state", state);

    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL("/settings", request.nextUrl.origin);
    url.searchParams.set("error", error instanceof Error ? error.message : "Could not start Microsoft OAuth.");
    return NextResponse.redirect(url);
  }
}
