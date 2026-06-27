import { logActivityEvent } from "@/lib/activity";
import { createId, readStore, updateStore } from "@/lib/store";
import { decryptText } from "@/lib/crypto";

type FetchedMessage = {
  externalId: string;
  threadId?: string;
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  date: Date;
};

// ─── Gmail via OAuth ─────────────────────────────────────────────────────────

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

async function fetchGmailMessages(accessToken: string): Promise<FetchedMessage[]> {
  try {
    const listResp = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox newer_than:2d",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listResp.ok) return [];
    const list = (await listResp.json()) as { messages?: Array<{ id: string; threadId: string }> };
    const ids = list.messages ?? [];
    const results: FetchedMessage[] = [];

    for (const { id, threadId } of ids.slice(0, 20)) {
      const msgResp = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!msgResp.ok) continue;

      type GmailPart = { mimeType: string; body?: { data?: string }; parts?: GmailPart[] };
      type GmailMsg = {
        id: string;
        threadId: string;
        payload?: { headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: GmailPart[] };
      };

      const msg = (await msgResp.json()) as GmailMsg;
      const headers = msg.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

      const fromRaw = get("From");
      const fromEmail = fromRaw.match(/<([^>]+)>/)?.[1] ?? fromRaw.trim();
      const fromName = fromRaw.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "") || fromEmail;

      const b64 = (data?: string) => (data ? Buffer.from(data, "base64url").toString("utf-8") : "");

      const findBody = (parts?: GmailPart[]): string => {
        if (!parts) return "";
        for (const part of parts) {
          if (part.mimeType === "text/plain" && part.body?.data) return b64(part.body.data);
          if (part.parts) { const sub = findBody(part.parts); if (sub) return sub; }
        }
        for (const part of parts) {
          if (part.mimeType === "text/html" && part.body?.data) {
            return b64(part.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          }
        }
        return "";
      };

      const body = msg.payload?.body?.data ? b64(msg.payload.body.data) : findBody(msg.payload?.parts);

      results.push({
        externalId: msg.id,
        threadId,
        from: fromName,
        fromEmail,
        subject: get("Subject"),
        body: body.slice(0, 2000),
        date: new Date(get("Date")),
      });
    }
    return results;
  } catch {
    return [];
  }
}

// ─── Outlook / Microsoft Graph ───────────────────────────────────────────────

async function exchangeMicrosoftToken(refreshToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "offline_access openid profile email User.Read Mail.Read",
    });
    const resp = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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

async function fetchOutlookMessages(accessToken: string): Promise<FetchedMessage[]> {
  try {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const url =
      `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages` +
      `?$top=20&$filter=receivedDateTime ge ${since}` +
      `&$select=id,subject,from,receivedDateTime,body,conversationId`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) return [];

    type OutlookMsg = {
      id: string;
      conversationId?: string;
      subject?: string;
      receivedDateTime?: string;
      from?: { emailAddress?: { name?: string; address?: string } };
      body?: { content?: string; contentType?: string };
    };

    const payload = (await resp.json()) as { value?: OutlookMsg[] };
    return (payload.value ?? []).map((msg) => {
      const fromEmail = msg.from?.emailAddress?.address ?? "";
      const fromName = msg.from?.emailAddress?.name ?? fromEmail;
      let body = msg.body?.content ?? "";
      if (msg.body?.contentType === "html") {
        body = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      return {
        externalId: msg.id,
        threadId: msg.conversationId,
        from: fromName,
        fromEmail,
        subject: msg.subject ?? "(no subject)",
        body: body.slice(0, 2000),
        date: new Date(msg.receivedDateTime ?? Date.now()),
      };
    });
  } catch {
    return [];
  }
}

// ─── SMTP / IMAP ─────────────────────────────────────────────────────────────

async function fetchSmtpInboxMessages(params: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}): Promise<FetchedMessage[]> {
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: params.host,
      port: params.port,
      secure: params.secure,
      auth: { user: params.username, pass: params.password },
      logger: false,
    });

    await client.connect();
    const messages: FetchedMessage[] = [];
    await client.mailboxOpen("INBOX");
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

    for await (const msg of client.fetch({ since }, { envelope: true, source: true })) {
      const fromAddr = msg.envelope?.from?.[0];
      const fromEmail = fromAddr?.address ?? "unknown";
      const fromName = fromAddr?.name?.trim() || fromEmail;
      const subject = msg.envelope?.subject ?? "(no subject)";
      const date = msg.envelope?.date ?? new Date();

      let body = "";
      if (msg.source) {
        const raw = msg.source.toString();
        const bodyStart = raw.indexOf("\r\n\r\n");
        if (bodyStart !== -1) {
          body = raw.slice(bodyStart + 4, bodyStart + 2000).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        }
      }

      messages.push({
        externalId: `smtp-${params.username}-${msg.uid}`,
        from: fromName,
        fromEmail,
        subject,
        body,
        date,
      });
    }

    await client.logout();
    return messages.slice(0, 20);
  } catch {
    return [];
  }
}

// ─── AI reply generation ──────────────────────────────────────────────────────

async function generateAiReply(params: {
  fromName: string;
  subject: string;
  body: string;
  leadContext?: string;
}): Promise<string> {
  const system = [
    "You are a senior B2B sales assistant for LeadForge.",
    "Write a concise, personalized reply to an inbound prospect email.",
    "Be warm, professional, and move the conversation forward.",
    "Max 3 sentences. No fluff. Match the energy of the prospect's message.",
    "Respond ONLY with the reply text — no subject line, no greeting, no signature.",
  ].join(" ");

  const userPrompt = [
    `From: ${params.fromName}`,
    `Subject: ${params.subject}`,
    `Message: ${params.body.slice(0, 600)}`,
    params.leadContext ? `Lead context: ${params.leadContext}` : "",
  ].filter(Boolean).join("\n");

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
          }),
        },
      );
      if (resp.ok) {
        const payload = (await resp.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch { /* fall through */ }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }],
          temperature: 0.4,
          max_tokens: 200,
        }),
      });
      if (resp.ok) {
        const payload = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = payload.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch { /* fall through */ }
  }

  // Heuristic fallback
  const text = (params.subject + " " + params.body).toLowerCase();
  if (/timing|next month|later|busy/i.test(text))
    return "Totally fair — I'll keep this light. Happy to follow up when timing is better, and I can share a short resource in the meantime that might be useful.";
  if (/price|cost|budget|how much/i.test(text))
    return "Great question on pricing. The fastest way to give you the right number is a quick 15-min call — I can walk you through what's included and tailor it to your team size.";
  if (/interest|yes|let's|book|call|sounds good|love/i.test(text))
    return "Glad to hear it! Let me send over a few time slots so we can get something on the calendar. Looking forward to connecting.";
  return "Thanks for reaching out. I'd love to tailor our next step to your specific situation — would a quick call this week work for you?";
}

// ─── Sentiment ───────────────────────────────────────────────────────────────

function detectSentiment(subject: string, body: string): "Positive" | "Neutral" | "At Risk" {
  const text = (subject + " " + body).toLowerCase();
  if (/interest|yes|let's|book|call|agree|sounds good|love|excited|want to|happy|definitely|forward/i.test(text))
    return "Positive";
  if (/not interested|unsubscribe|remove|stop|cancel|don't contact|wrong person|not the right/i.test(text))
    return "At Risk";
  return "Neutral";
}

// ─── Main poll ────────────────────────────────────────────────────────────────

export async function pollInboxForReplies(): Promise<{ newMessages: number }> {
  const store = await readStore();
  if (!store.emailAccounts.length) return { newMessages: 0 };

  const seenIds = new Set<string>(store.seenInboxMessageIds ?? []);
  let totalNew = 0;

  for (const account of store.emailAccounts) {
    let messages: FetchedMessage[] = [];

    if (account.provider === "google") {
      const accessToken = await exchangeGoogleToken(decryptText(account.refreshTokenEncrypted));
      if (accessToken) messages = await fetchGmailMessages(accessToken);
    } else if (account.provider === "microsoft") {
      const accessToken = await exchangeMicrosoftToken(decryptText(account.refreshTokenEncrypted));
      if (accessToken) messages = await fetchOutlookMessages(accessToken);
    } else if (account.provider === "smtp" && account.smtpHost && account.smtpUsername) {
      const password = decryptText(account.refreshTokenEncrypted);
      const imapHost = account.smtpHost.replace(/^smtp\./i, "imap.");
      const imapPort = account.smtpSecure ? 993 : 143;
      messages = await fetchSmtpInboxMessages({
        host: imapHost,
        port: imapPort,
        secure: account.smtpSecure ?? true,
        username: account.smtpUsername,
        password,
      });
    }

    for (const msg of messages) {
      if (seenIds.has(msg.externalId)) continue;
      seenIds.add(msg.externalId);

      const freshStore = await readStore();

      // Match sender → known lead
      const matchedLead = freshStore.leads.find(
        (l) => l.email.toLowerCase() === msg.fromEmail.toLowerCase(),
      );

      // Match sender → autonomous campaign step, route reply into thread
      let matchedCampaignId: string | undefined;
      let matchedStepLeadId: string | undefined;
      for (const campaign of freshStore.autonomousCampaigns ?? []) {
        if (campaign.userId !== account.userId) continue;
        const step = campaign.steps.find(
          (s) => s.leadEmail.toLowerCase() === msg.fromEmail.toLowerCase(),
        );
        if (step) {
          matchedCampaignId = campaign.id;
          matchedStepLeadId = step.leadId;
          await updateStore((draft) => {
            const c = draft.autonomousCampaigns?.find((x) => x.id === campaign.id);
            const s = c?.steps.find((x) => x.leadId === step.leadId);
            if (s) {
              s.conversationHistory = [
                ...(s.conversationHistory ?? []),
                { role: "user", content: msg.body || msg.subject, sentAt: msg.date.toISOString() },
              ];
              s.status = "replied";
              s.conversationState = "in_conversation";
              s.lastActionAt = new Date().toISOString();
              if (c) c.totalReplied = (c.totalReplied ?? 0) + 1;
            }
            return draft;
          });
          break;
        }
      }

      const leadContext = matchedLead
        ? `${matchedLead.name}, ${matchedLead.title} at ${matchedLead.company}. Pain points: ${matchedLead.painPoints.join(", ")}.`
        : undefined;

      const sentiment = detectSentiment(msg.subject, msg.body);
      const recommendedReply = await generateAiReply({
        fromName: msg.from,
        subject: msg.subject,
        body: msg.body,
        leadContext,
      });

      const msgId = createId("INB");
      const domain = msg.fromEmail.match(/@([\w.-]+)/)?.[1] ?? msg.from;

      await updateStore((draft) => {
        draft.inbox.unshift({
          id: msgId,
          from: msg.from,
          fromEmail: msg.fromEmail,
          company: matchedLead?.company ?? domain,
          subject: msg.subject,
          preview: (msg.body || msg.subject).slice(0, 140),
          emailBody: msg.body,
          sentiment,
          recommendedReply,
          receivedAt: msg.date.toISOString(),
          leadId: matchedLead?.id,
          campaignId: matchedCampaignId,
          campaignStepLeadId: matchedStepLeadId,
          externalMessageId: msg.externalId,
          threadId: msg.threadId,
        });
        draft.inbox = draft.inbox.slice(0, 200);
        draft.seenInboxMessageIds = [
          ...(draft.seenInboxMessageIds ?? []),
          msg.externalId,
        ].slice(-500);
        return draft;
      });

      await logActivityEvent({
        userId: account.userId,
        type: "assistant",
        title: `Inbox: reply from ${msg.from}`,
        detail: msg.subject,
        status: "done",
      });

      totalNew++;
    }
  }

  return { newMessages: totalNew };
}
