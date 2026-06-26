import nodemailer from "nodemailer";
import { decryptText } from "@/lib/crypto";
import { readStore, type EmailAccount } from "@/lib/store";

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function exchangeGoogleRefreshToken(account: EmailAccount) {
  const refreshToken = decryptText(account.refreshTokenEncrypted);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed (${response.status}).`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

async function exchangeMicrosoftRefreshToken(account: EmailAccount) {
  const refreshToken = decryptText(account.refreshTokenEncrypted);
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: "offline_access openid profile email User.Read Mail.Send",
  });

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Microsoft token refresh failed (${response.status}).`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

async function sendWithSmtp(account: EmailAccount, params: { to: string; subject: string; html: string; text: string }) {
  if (!account.smtpHost || !account.smtpPort || !account.smtpUsername) {
    throw new Error("SMTP account is incomplete.");
  }

  const password = decryptText(account.refreshTokenEncrypted);
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: Boolean(account.smtpSecure),
    auth: {
      user: account.smtpUsername,
      pass: password,
    },
  });

  await transporter.sendMail({
    from: account.smtpFromName ? `${account.smtpFromName} <${account.email}>` : account.email,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  return { provider: account.provider, fromEmail: account.email };
}

export async function sendEmailWithAccount(params: {
  accountId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const store = await readStore();
  const account = store.emailAccounts.find((item) => item.id === params.accountId);
  if (!account) {
    throw new Error("Email account not found.");
  }

  if (account.provider === "smtp") {
    return sendWithSmtp(account, params);
  }

  if (account.provider === "google") {
    const accessToken = await exchangeGoogleRefreshToken(account);
    const raw = [
      `From: ${account.email}`,
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      params.html,
    ].join("\r\n");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: base64UrlEncode(raw) }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Gmail send failed (${response.status}): ${message}`);
    }

    return { provider: account.provider, fromEmail: account.email };
  }

  const accessToken = await exchangeMicrosoftRefreshToken(account);
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: {
          contentType: "HTML",
          content: params.html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: params.to,
            },
          },
        ],
      },
      saveToSentItems: true,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Microsoft send failed (${response.status}): ${message}`);
  }

  return { provider: account.provider, fromEmail: account.email };
}
