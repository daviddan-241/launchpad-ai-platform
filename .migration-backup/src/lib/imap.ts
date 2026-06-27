import { logActivityEvent } from "@/lib/activity";
import { createId, readStore, updateStore } from "@/lib/store";
import { decryptText } from "@/lib/crypto";

type ImapMessage = {
  uid: number;
  from: string;
  subject: string;
  text: string;
  date: Date;
};

async function fetchSmtpInboxMessages(params: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}): Promise<ImapMessage[]> {
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: params.host,
      port: params.port,
      secure: params.secure,
      auth: {
        user: params.username,
        pass: params.password,
      },
      logger: false,
    });

    await client.connect();
    const messages: ImapMessage[] = [];

    await client.mailboxOpen("INBOX");
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

    for await (const msg of client.fetch(
      { since },
      { envelope: true, bodyStructure: true, source: false },
    )) {
      const from = msg.envelope?.from?.[0]?.address ?? "unknown";
      const subject = msg.envelope?.subject ?? "(no subject)";
      const date = msg.envelope?.date ?? new Date();
      messages.push({ uid: msg.uid, from, subject, text: "", date });
    }

    await client.logout();
    return messages.slice(0, 20);
  } catch {
    return [];
  }
}

async function fetchGmailInboxMessages(accessToken: string): Promise<ImapMessage[]> {
  try {
    const listResp = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox is:unread",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listResp.ok) return [];
    const list = (await listResp.json()) as { messages?: Array<{ id: string }> };
    const ids = list.messages ?? [];
    const results: ImapMessage[] = [];

    for (const { id } of ids.slice(0, 10)) {
      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!msgResp.ok) continue;
      const msg = (await msgResp.json()) as {
        id: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = msg.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
      results.push({
        uid: parseInt(msg.id, 16),
        from: get("From"),
        subject: get("Subject"),
        text: "",
        date: new Date(get("Date")),
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function exchangeGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!resp.ok) return null;
    const payload = (await resp.json()) as { access_token?: string };
    return payload.access_token ?? null;
  } catch {
    return null;
  }
}

export async function pollInboxForReplies() {
  const store = await readStore();
  if (!store.emailAccounts.length) return;

  for (const account of store.emailAccounts) {
    let messages: ImapMessage[] = [];

    if (account.provider === "smtp" && account.smtpHost && account.smtpUsername) {
      const password = decryptText(account.refreshTokenEncrypted);
      const imapHost = account.smtpHost.replace(/^smtp\./, "imap.");
      const imapPort = account.smtpSecure ? 993 : 143;
      messages = await fetchSmtpInboxMessages({
        host: imapHost,
        port: imapPort,
        secure: account.smtpSecure ?? true,
        username: account.smtpUsername,
        password,
      });
    } else if (account.provider === "google") {
      const refreshToken = decryptText(account.refreshTokenEncrypted);
      const accessToken = await exchangeGoogleToken(refreshToken);
      if (accessToken) {
        messages = await fetchGmailInboxMessages(accessToken);
      }
    }

    if (!messages.length) continue;

    const knownIds = new Set(store.inbox.map((m) => m.id));

    for (const msg of messages) {
      const msgId = createId("INB");
      if (knownIds.has(msgId)) continue;

      const fromName = msg.from.replace(/<[^>]+>/, "").trim() || msg.from;
      const domain = msg.from.match(/@([\w.]+)/)?.[1] ?? "unknown";
      const sentiment = /interest|yes|let|book|call|agree|happy|sounds|great|love/i.test(msg.subject)
        ? "positive"
        : /no|not|cancel|unsubscribe|stop|remove/i.test(msg.subject)
          ? "negative"
          : "neutral";

      await updateStore((s) => {
        s.inbox.unshift({
          id: msgId,
          from: fromName,
          company: domain,
          subject: msg.subject,
          preview: `Reply received from ${msg.from}`,
          sentiment,
          receivedAt: msg.date.toISOString(),
        });
        s.inbox = s.inbox.slice(0, 100);
        return s;
      });

      await logActivityEvent({
        userId: account.userId,
        type: "assistant",
        title: `Inbox: reply from ${fromName}`,
        detail: msg.subject,
        status: "done",
      });
    }
  }
}
