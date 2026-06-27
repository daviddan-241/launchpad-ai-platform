import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getMicrosoftOauthConfig, upsertEmailAccount, verifyOauthState } from "@/lib/oauth";

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
    const validState = await verifyOauthState("microsoft", state);
    if (!validState) {
      throw new Error("Invalid Microsoft OAuth state.");
    }

    const { clientId, clientSecret, redirectUri } = getMicrosoftOauthConfig(request.nextUrl.origin);
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: "offline_access openid profile email User.Read Mail.Send",
    });

    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Microsoft token exchange failed (${tokenResponse.status}).`);
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token: string; refresh_token?: string };
    if (!tokenPayload.refresh_token) {
      throw new Error("Microsoft did not return a refresh token.");
    }

    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new Error(`Could not load Microsoft profile (${profileResponse.status}).`);
    }

    const profile = (await profileResponse.json()) as { mail?: string; userPrincipalName?: string };
    const email = profile.mail || profile.userPrincipalName;
    if (!email) {
      throw new Error("Microsoft account email was not returned.");
    }

    await upsertEmailAccount({
      user,
      provider: "microsoft",
      email,
      refreshToken: tokenPayload.refresh_token,
    });

    redirectUrl.searchParams.set("connected", "outlook");
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    redirectUrl.searchParams.set("error", err instanceof Error ? err.message : "Could not connect Outlook.");
    return NextResponse.redirect(redirectUrl);
  }
}
