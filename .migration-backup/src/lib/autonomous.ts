import { logActivityEvent } from "@/lib/activity";
import { sendEmailWithAccount } from "@/lib/email";
import { autoCreateAndSendPayment } from "@/lib/payments";
import { detectBusinessNeeds } from "@/lib/business-detector";
import { generateAndSavePortfolio } from "@/lib/portfolio-generator";
import { notifyInterestedReply, notifyPaymentLinkSent } from "@/lib/notifications";
import { scoreAndPersistLead } from "@/lib/lead-scorer";
import { createId, readStore, updateStore, type AutonomousCampaign, type AutoCampaignStep } from "@/lib/store";

// ─── AI Core — Gemini primary, Groq fallback ─────────────────────────────────

async function callAI(system: string, user: string, json = false): Promise<string> {
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
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.65, ...(json ? { responseMimeType: "application/json" } : {}) },
          }),
        },
      );
      if (resp.ok) {
        const d = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        if (t) return t;
      }
    } catch { /* fall through to Groq */ }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.6,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (resp.ok) {
        const d = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const t = d.choices?.[0]?.message?.content?.trim() ?? "";
        if (t) return t;
      }
    } catch { /* no AI available */ }
  }

  return "";
}

// ─── Persona ───────────────────────────────────────────────────────────────

function persona(senderName: string, offer: string): string {
  const first = senderName.split(" ")[0];
  return `You are ${first}, a growth consultant with 9 years helping small businesses get more clients online. You specialise in ${offer}.

STRICT WRITING RULES — never break these:
- Write like a real human texting a colleague. Short. Natural.
- Max 3-4 sentences per message. Often just 1-2.
- Use contractions: don't, it's, I've, we'll, you're.
- NEVER say "I hope this email finds you well", "I wanted to reach out", "as per", "I am writing to".
- Never use bullet points or headers in emails.
- Be warm, curious, a little direct. One question per message.
- Mention price casually only if they ask. Never push for it.
- If they ask for past work/portfolio/examples — share the link naturally like a friend would.
- Only offer payment link if they explicitly say "yes", "let's do it", "send me the link", "how do I pay", "I'm in".
- If they ask if you're a bot: say no, you're a real person.
- Never be desperate or pushy.`;
}

// ─── Intent classifier ─────────────────────────────────────────────────────

type Intent =
  | "interested"
  | "asking_price"
  | "ready_to_pay"
  | "wants_portfolio"
  | "asking_timeline"
  | "asking_process"
  | "objection"
  | "not_interested"
  | "neutral";

async function classifyIntent(text: string): Promise<Intent> {
  const sys = `Classify this email reply. Return ONLY one word from this list:
interested | asking_price | ready_to_pay | wants_portfolio | asking_timeline | asking_process | objection | not_interested | neutral

Definitions:
- ready_to_pay: says yes/let's go/send the link/how do I pay/I'm ready/I'm in
- not_interested: clear no/unsubscribe/stop/remove me/not for us
- objection: doubt/too expensive/tried this before/already have someone/not sure
- wants_portfolio: do you have examples/show me your work/past clients/proof/references
- asking_price: how much/what's the cost/pricing/rates/fee
- asking_timeline: how long/when/timeline/turnaround
- asking_process: how does it work/what's the process/what do you do
- interested: positive reply, wants to learn more, general yes/sounds good
- neutral: unclear/generic reply`;

  const raw = await callAI(sys, `Reply: "${text.slice(0, 600)}"`, false);
  const intents: Intent[] = ["ready_to_pay", "not_interested", "wants_portfolio", "asking_price", "asking_timeline", "asking_process", "objection", "interested", "neutral"];
  const lower = raw.toLowerCase().trim();
  return intents.find((i) => lower.startsWith(i) || lower.includes(i)) ?? "neutral";
}

// ─── Email generators ──────────────────────────────────────────────────────

type EmailDraft = { subject: string; body: string };

function makeHtml(text: string): string {
  return text.split("\n").map((l) => l.trim() ? `<p>${l}</p>` : "").join("");
}

async function genOutreach(p: { leadName: string; company: string; niche: string; offer: string; hook: string; senderName: string }): Promise<EmailDraft> {
  const sys = `${persona(p.senderName, p.offer)}

Write a cold outreach email. Rules:
- Subject: max 6 words, lowercase, conversational (no exclamation, no "FREE", no "Quick question about [company]")
- Body: 2-3 SHORT sentences. Open conversation — don't pitch yet.
- End with exactly ONE casual question.
- Do NOT mention price.
- Return valid JSON: {"subject": "...", "body": "..."}`;

  const raw = await callAI(sys, `Write cold email to ${p.leadName} at ${p.company} (${p.niche}). Their likely pain: ${p.hook}. Sender: ${p.senderName}.`, true);
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Partial<EmailDraft>;
    if (parsed.subject && parsed.body) return parsed as EmailDraft;
  } catch { /* fallback */ }
  return {
    subject: `question about ${p.company}`,
    body: `Hi ${p.leadName.split(" ")[0]},\n\nI help ${p.niche} businesses with ${p.offer} and came across ${p.company} — thought it might be worth a quick chat.\n\nIs this something on your radar at all?\n\n${p.senderName}`,
  };
}

async function genConversationReply(p: {
  leadName: string; company: string; niche: string; offer: string; senderName: string;
  price: number; currency: string; history: string; latestReply: string;
  intent: Intent; portfolioUrl?: string;
}): Promise<EmailDraft> {
  const portfolioNote = p.portfolioUrl
    ? `Portfolio/examples page to share if they asked: ${p.portfolioUrl}`
    : "";

  const sys = `${persona(p.senderName, p.offer)}

You're replying to an email thread. Context:
- Their intent: ${p.intent}
- If asking_price: give a casual range. Don't recite features.
- If wants_portfolio: share the portfolio link like "here's some of our recent work: [link]"
- If asking_timeline: give a realistic estimate casually.
- If asking_process: 2 sentences, plain language.
- If objection: acknowledge it, ask what happened or what's the concern. Don't argue.
- If interested/neutral: ask one question about their specific situation.
${portfolioNote}

NEVER send or mention payment links unless intent is ready_to_pay.
Return valid JSON: {"subject": "...", "body": "..."}`;

  const raw = await callAI(sys, `Conversation so far:\n${p.history}\n\nLatest reply from ${p.leadName}: "${p.latestReply}"\n\nWrite your next reply as ${p.senderName}.`, true);
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Partial<EmailDraft>;
    if (parsed.subject && parsed.body) return parsed as EmailDraft;
  } catch { /* fallback */ }
  const fallbackBody = p.intent === "asking_price"
    ? `Thanks for asking — it's usually around ${p.currency} ${p.price} depending on the scope. Happy to give you a more exact number once I know a bit more about what you need.\n\nWhat's your current situation with ${p.offer.split(" ")[0]}?\n\n${p.senderName}`
    : `Appreciate the reply! Tell me a bit more about ${p.company} — what does your current setup look like for ${p.offer.split(" ")[0]}?\n\n${p.senderName}`;
  return { subject: `Re: ${p.company}`, body: fallbackBody };
}

async function genFollowUp(p: { leadName: string; company: string; offer: string; senderName: string; days: number }): Promise<EmailDraft> {
  const sys = `${persona(p.senderName, p.offer)}

Write a short follow-up email to someone who didn't reply. Rules:
- Max 2 sentences + one casual question.
- Sound human, not like an automated drip.
- Don't be needy or apologetic.
Return valid JSON: {"subject": "...", "body": "..."}`;

  const raw = await callAI(sys, `Follow up with ${p.leadName} at ${p.company}. It's been ${p.days} days about ${p.offer}. Sender: ${p.senderName}.`, true);
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Partial<EmailDraft>;
    if (parsed.subject && parsed.body) return parsed as EmailDraft;
  } catch { /* fallback */ }
  return {
    subject: "still relevant?",
    body: `Hey ${p.leadName.split(" ")[0]}, just bumping this — is ${p.offer} still worth exploring for ${p.company}?\n\n${p.senderName}`,
  };
}

function genPaymentReply(p: { leadName: string; offer: string; senderName: string; price: number; currency: string; paymentLink: string }): EmailDraft {
  const first = p.leadName.split(" ")[0];
  return {
    subject: `Re: ${p.offer} — payment link`,
    body: `${first}, great — glad we're on the same page.\n\nHere's the payment link to get started: ${p.paymentLink}\n\nOnce that's done I'll kick things off within 24 hours. Let me know if you have any questions.\n\n${p.senderName}`,
  };
}

// ─── Human-like response delay ────────────────────────────────────────────

function nextResponseAt(): string {
  const minMs = 3 * 60 * 1000;
  const maxMs = 18 * 60 * 1000;
  return new Date(Date.now() + minMs + Math.random() * (maxMs - minMs)).toISOString();
}

function isReadyToRespond(step: AutoCampaignStep): boolean {
  if (!step.nextResponseAt) return true;
  return Date.now() >= new Date(step.nextResponseAt).getTime();
}

// ─── Lead generation ──────────────────────────────────────────────────────

type RawLead = { name: string; email: string; company: string; industry: string; region: string };

async function generateLeads(niche: string, count: number, region?: string): Promise<RawLead[]> {
  const regionText = region ? ` in ${region}` : "";
  const sys = `You generate realistic B2B lead profiles. Return ONLY a valid JSON array. No markdown.
Each object must have: name, email, company, industry, region.
Email format: firstname.lastname@company.com or info@company.com.
Generate exactly ${count} leads for the niche "${niche}"${regionText}.`;

  // Groq doesn't support json_object for array root — wrap it
  const groqSys = sys + " Wrap the array in a JSON object: {\"leads\": [...]}";

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const raw = await callAI(sys, `Generate ${count} leads for "${niche}"${regionText}.`, true);
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const arr: RawLead[] = Array.isArray(parsed) ? parsed : (parsed as { leads?: RawLead[] }).leads ?? [];
      if (arr.length) return arr.slice(0, count);
    } catch { /* try groq */ }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: groqSys },
            { role: "user", content: `Generate ${count} leads for "${niche}"${regionText}.` },
          ],
        }),
      });
      if (resp.ok) {
        const d = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = d.choices?.[0]?.message?.content?.trim() ?? "";
        const parsed = JSON.parse(text) as { leads?: RawLead[] };
        if (Array.isArray(parsed.leads) && parsed.leads.length) return parsed.leads.slice(0, count);
      }
    } catch { /* no leads */ }
  }

  return [];
}

// ─── Campaign processor ───────────────────────────────────────────────────

async function processCampaign(campaign: AutonomousCampaign): Promise<void> {
  const store = await readStore();
  const account = store.emailAccounts.find((a) => a.id === campaign.emailAccountId && a.userId === campaign.userId);
  if (!account) return;
  const senderName = store.users.find((u) => u.id === campaign.userId)?.name ?? "Alex";

  // ── Phase 1: Generate leads ──
  if (campaign.steps.length === 0) {
    const rawLeads = await generateLeads(campaign.niche, campaign.targetCount, campaign.region);
    if (!rawLeads.length) return;

    const steps: AutoCampaignStep[] = rawLeads.map((l) => ({
      leadId: createId("ALD"),
      leadName: l.name,
      leadEmail: l.email,
      company: l.company,
      status: "pending",
      conversationState: "pending",
      conversationHistory: [],
      lastActionAt: new Date().toISOString(),
    }));

    await updateStore((d) => {
      const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
      if (c) { c.steps = steps; c.updatedAt = new Date().toISOString(); }
    });
    campaign = (await readStore()).autonomousCampaigns.find((x) => x.id === campaign.id)!;
    if (!campaign) return;
  }

  // ── Phase 2: Send initial outreach (batch 5 per run) ──
  const pending = campaign.steps.filter((s) => s.conversationState === "pending").slice(0, 5);
  for (const step of pending) {
    try {
      const { topNeed } = await detectBusinessNeeds({
        company: step.company, industry: campaign.niche, niche: campaign.niche, region: campaign.region ?? "",
      });
      const hook = topNeed.hook
        .replace("[city]", campaign.region ?? "your city")
        .replace("[food type]", campaign.niche)
        .replace("[food]", campaign.niche)
        .replace("[law type]", campaign.niche)
        .replace("[area]", campaign.region ?? "your area");

      const { subject, body } = await genOutreach({
        leadName: step.leadName, company: step.company, niche: campaign.niche,
        offer: campaign.offer, hook, senderName,
      });

      await sendEmailWithAccount({ accountId: account.id, to: step.leadEmail, subject, html: makeHtml(body), text: body });

      await updateStore((d) => {
        const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s) {
          s.status = "emailed";
          s.conversationState = "emailed";
          s.conversationHistory = [{ role: "assistant", content: body, sentAt: new Date().toISOString() }];
          s.lastActionAt = new Date().toISOString();
        }
        if (c) { c.totalEmailed = (c.totalEmailed || 0) + 1; c.updatedAt = new Date().toISOString(); }
      });
    } catch { /* skip failed send */ }
  }

  // ── Phase 3: Follow up on cold leads (no reply after 3 days, one follow-up each) ──
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const cold = campaign.steps.filter(
    (s) => s.conversationState === "emailed" && !s.followedUp && new Date(s.lastActionAt).getTime() < threeDaysAgo,
  ).slice(0, 3);

  for (const step of cold) {
    try {
      const days = Math.round((Date.now() - new Date(step.lastActionAt).getTime()) / 86_400_000);
      const { subject, body } = await genFollowUp({ leadName: step.leadName, company: step.company, offer: campaign.offer, senderName, days });
      await sendEmailWithAccount({ accountId: account.id, to: step.leadEmail, subject, html: makeHtml(body), text: body });
      await updateStore((d) => {
        const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s) {
          s.followedUp = true;
          s.conversationState = "followed_up";
          s.conversationHistory = [...(s.conversationHistory ?? []), { role: "assistant", content: body, sentAt: new Date().toISOString() }];
          s.lastActionAt = new Date().toISOString();
        }
      });
    } catch { /* skip */ }
  }

  // ── Phase 4: Handle inbox replies and have real conversations ──
  const freshStore = await readStore();
  const fresh = freshStore.autonomousCampaigns.find((x) => x.id === campaign.id);
  if (!fresh) return;

  const activeSteps = fresh.steps.filter((s) =>
    ["emailed", "followed_up", "in_conversation", "offer_made"].includes(s.conversationState ?? ""),
  );

  const inboxMessages = freshStore.inbox.filter((msg) => {
    const from = (msg.from ?? "").toLowerCase();
    return activeSteps.some((l) => {
      const leadUser = l.leadEmail.toLowerCase().split("@")[0];
      return from.includes(leadUser) || from === l.leadEmail.toLowerCase();
    });
  });

  for (const msg of inboxMessages) {
    const step = activeSteps.find((l) => {
      const from = (msg.from ?? "").toLowerCase();
      const leadUser = l.leadEmail.toLowerCase().split("@")[0];
      return from.includes(leadUser) || from === l.leadEmail.toLowerCase();
    });
    if (!step) continue;

    // Skip already-handled messages
    const msgSnippet = (msg.preview ?? msg.subject ?? "").slice(0, 60);
    const alreadyHandled = (step.conversationHistory ?? []).some(
      (h) => h.role === "user" && h.content.slice(0, 60) === msgSnippet,
    );
    if (alreadyHandled) continue;

    // Enforce human-like delay
    if (!isReadyToRespond(step)) continue;

    const replyText = msg.preview ?? msg.subject ?? "";
    const intent = await classifyIntent(replyText);

    // Handle unsubscribes
    if (intent === "not_interested") {
      await updateStore((d) => {
        const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s) { s.conversationState = "declined"; s.status = "declined"; s.lastActionAt = new Date().toISOString(); }
      });
      continue;
    }

    // Notify owner of hot leads
    if (["interested", "asking_price", "ready_to_pay", "wants_portfolio"].includes(intent)) {
      notifyInterestedReply({ clientName: step.leadName, clientEmail: step.leadEmail, company: step.company, replyText }).catch(() => undefined);
    }

    const history = (step.conversationHistory ?? [])
      .map((m) => `${m.role === "assistant" ? senderName : step.leadName}: ${m.content}`)
      .join("\n\n");

    let draft: EmailDraft;
    let newState = "in_conversation";

    if (intent === "ready_to_pay") {
      try {
        const payment = await autoCreateAndSendPayment({
          userId: campaign.userId,
          clientName: step.leadName,
          clientEmail: step.leadEmail,
          description: campaign.offer,
          amount: campaign.price,
          currency: campaign.currency,
        });
        draft = genPaymentReply({ leadName: step.leadName, offer: campaign.offer, senderName, price: campaign.price, currency: campaign.currency, paymentLink: payment.link });
        newState = "payment_requested";

        await updateStore((d) => {
          const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
          const s = c?.steps.find((x) => x.leadId === step.leadId);
          if (s) { s.paymentId = payment.id; s.status = "payment_sent"; }
        });
        notifyPaymentLinkSent({ clientName: step.leadName, clientEmail: step.leadEmail, amount: campaign.price, currency: campaign.currency }).catch(() => undefined);
      } catch {
        draft = await genConversationReply({ leadName: step.leadName, company: step.company, niche: campaign.niche, offer: campaign.offer, senderName, price: campaign.price, currency: campaign.currency, history, latestReply: replyText, intent: "asking_price" });
      }
    } else if (intent === "wants_portfolio") {
      let portfolioUrl: string | undefined;
      try {
        const port = await generateAndSavePortfolio({ offer: campaign.offer, niche: campaign.niche, senderName, region: campaign.region ?? "" });
        portfolioUrl = port.url;
      } catch { /* send without link */ }
      draft = await genConversationReply({ leadName: step.leadName, company: step.company, niche: campaign.niche, offer: campaign.offer, senderName, price: campaign.price, currency: campaign.currency, history, latestReply: replyText, intent, portfolioUrl });
      newState = "offer_made";
    } else {
      draft = await genConversationReply({ leadName: step.leadName, company: step.company, niche: campaign.niche, offer: campaign.offer, senderName, price: campaign.price, currency: campaign.currency, history, latestReply: replyText, intent });
      if (intent === "asking_price") newState = "offer_made";
    }

    try {
      await sendEmailWithAccount({ accountId: account.id, to: step.leadEmail, subject: draft.subject, html: makeHtml(draft.body), text: draft.body });

      await updateStore((d) => {
        const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s && !["payment_requested", "declined"].includes(s.conversationState ?? "")) {
          s.conversationState = newState;
          s.status = newState === "payment_requested" ? "payment_sent" : "replied";
          s.conversationHistory = [
            ...(s.conversationHistory ?? []),
            { role: "user", content: replyText, sentAt: new Date().toISOString() },
            { role: "assistant", content: draft.body, sentAt: new Date().toISOString() },
          ];
          s.lastActionAt = new Date().toISOString();
          s.nextResponseAt = nextResponseAt();
        }
        if (c) { c.totalReplied = (c.totalReplied || 0) + 1; c.updatedAt = new Date().toISOString(); }
      });

      await logActivityEvent({ userId: campaign.userId, type: "outreach", title: `Auto-reply to ${step.leadName} (${intent})`, detail: `${step.company} — ${draft.subject}`, status: "done" });

      // Score lead in background after every reply
      scoreAndPersistLead({
        campaignId: campaign.id,
        leadId: step.leadId,
        history: [
          ...(step.conversationHistory ?? []),
          { role: "user" as const, content: replyText, sentAt: new Date().toISOString() },
          { role: "assistant" as const, content: draft.body, sentAt: new Date().toISOString() },
        ],
      }).catch(() => undefined);
    } catch { /* skip */ }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function launchAutonomousCampaign(params: {
  userId: string; name: string; niche: string; offer: string;
  price: number; currency: string; targetCount: number; region?: string; emailAccountId: string;
}): Promise<AutonomousCampaign> {
  const campaign: AutonomousCampaign = {
    id: createId("AUTO"),
    userId: params.userId,
    name: params.name,
    niche: params.niche,
    offer: params.offer,
    price: params.price,
    currency: params.currency,
    targetCount: Math.min(params.targetCount, 100),
    region: params.region,
    status: "running",
    steps: [],
    emailAccountId: params.emailAccountId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalEmailed: 0,
    totalReplied: 0,
    totalPaid: 0,
    totalRevenue: 0,
  };

  await updateStore((d) => {
    if (!d.autonomousCampaigns) d.autonomousCampaigns = [];
    d.autonomousCampaigns.unshift(campaign);
  });

  await logActivityEvent({
    userId: params.userId, type: "campaign",
    title: `Autonomous campaign launched: ${params.name}`,
    detail: `${params.targetCount} ${params.niche} leads → ${params.offer} @ ${params.currency} ${params.price}`,
    status: "done",
  });

  return campaign;
}

export async function runAutonomousCampaigns(): Promise<void> {
  const store = await readStore();
  const running = (store.autonomousCampaigns ?? []).filter((c) => c.status === "running");
  for (const c of running) {
    await processCampaign(c).catch(() => undefined);
  }
}
