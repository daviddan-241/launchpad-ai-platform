import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getGoogleOauthConfig, upsertEmailAccount, verifyOauthState } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const error = request.nextUrl.searchParams.get("error");
  const redirectUrl = new URL("/settings", request.nextUrl.origin);

  if (error) {
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const user = await requireCurrentUser();
    const validState = await verifyOauthState("google", state);
    if (!validState) {
      throw new Error("Invalid Google OAuth state.");
    }

    const { clientId, clientSecret, redirectUri } = getGoogleOauthConfig(request.nextUrl.origin);
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Google token exchange failed (${tokenResponse.status}).`);
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token: string; refresh_token?: string };
    if (!tokenPayload.refresh_token) {
      throw new Error("Google did not return a refresh token. Reconnect with consent prompt enabled.");
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    if (!profileResponse.ok) {
      throw new Error(`Could not load Google profile (${profileResponse.status}).`);
    }

    const profile = (await profileResponse.json()) as { email?: string };
    if (!profile.email) {
      throw new Error("Google account email was not returned.");
    }

    await upsertEmailAccount({
      user,
      provider: "google",
      email: profile.email,
      refreshToken: tokenPayload.refresh_token,
    });

    redirectUrl.searchParams.set("connected", "gmail");
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    redirectUrl.searchParams.set("error", err instanceof Error ? err.message : "Could not connect Gmail.");
    return NextResponse.redirect(redirectUrl);
  }
}
