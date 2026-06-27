import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { logActivityEvent } from "@/lib/activity";
import { encryptText } from "@/lib/crypto";
import { createId, updateStore, type EmailProvider, type User } from "@/lib/store";

const OAUTH_COOKIE = "leadforge_oauth_state";

export function createOauthState() {
  return randomBytes(24).toString("hex");
}

export async function setOauthStateCookie(provider: EmailProvider, state: string) {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_COOKIE, `${provider}:${state}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function verifyOauthState(provider: EmailProvider, state: string) {
  const cookieStore = await cookies();
  const saved = cookieStore.get(OAUTH_COOKIE)?.value;
  cookieStore.set(OAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return saved === `${provider}:${state}`;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. Add it to your environment variables.`);
  }
  return value;
}

export function getGoogleOauthConfig(origin: string) {
  return {
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: `${origin}/api/integrations/google/callback`,
  };
}

export function getMicrosoftOauthConfig(origin: string) {
  return {
    clientId: requireEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: requireEnv("MICROSOFT_CLIENT_SECRET"),
    redirectUri: `${origin}/api/integrations/microsoft/callback`,
  };
}

export async function upsertEmailAccount(params: {
  user: User;
  provider: EmailProvider;
  email: string;
  refreshToken: string;
}) {
  const { user, provider, email, refreshToken } = params;
  const now = new Date().toISOString();
  const refreshTokenEncrypted = encryptText(refreshToken);

  let savedId = "";
  let isUpdate = false;
  await updateStore((store) => {
    const existing = store.emailAccounts.find(
      (account) => account.userId === user.id && account.provider === provider && account.email === email,
    );

    if (existing) {
      existing.refreshTokenEncrypted = refreshTokenEncrypted;
      existing.updatedAt = now;
      savedId = existing.id;
      isUpdate = true;
      return store;
    }

    const created = {
      id: createId("EML"),
      userId: user.id,
      provider,
      email,
      refreshTokenEncrypted,
      connectedAt: now,
      updatedAt: now,
    };

    store.emailAccounts.unshift(created);
    savedId = created.id;
    return store;
  });

  await logActivityEvent({
    userId: user.id,
    type: "integration",
    title: `${isUpdate ? "Updated" : "Connected"} ${provider === "google" ? "Gmail" : "Outlook"} account`,
    detail: email,
    status: "done",
  });

  return savedId;
}
