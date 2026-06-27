import { logActivityEvent } from "@/lib/activity";
import { sendEmailWithAccount } from "@/lib/email";
import { autoCreateAndSendPayment } from "@/lib/payments";
import { detectBusinessNeeds } from "@/lib/business-detector";
import { generateAndSavePortfolio } from "@/lib/portfolio-generator";
import { notifyInterestedReply, notifyPaymentLinkSent } from "@/lib/notifications";
import { createId, readStore, updateStore, type AutonomousCampaign, type AutoCampaignStep } from "@/lib/store";

// ─── AI Core ────────────────────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string, json = false): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  if (!key) return "";
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.65, ...(json ? { responseMimeType: "application/json" } : {}) },
        }),
      },
    );
    if (resp.ok) {
      const d = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    }
  } catch { /* fallback */ }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqModel, temperature: 0.6,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        }),
      });
      if (resp.ok) {
        const d = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        return d.choices?.[0]?.message?.content?.trim() ?? "";
      }
    } catch { /* skip */ }
  }
  return "";
}

// ─── Persona System ──────────────────────────────────────────────────────────
// The AI consultant persona — sounds like a real person, not a bot

function buildPersona(senderName: string, offer: string): string {
  const firstName = senderName.split(" ")[0];
  return `You are ${firstName}, a digital growth consultant with 9 years of experience helping small and medium businesses grow online. You specialise in ${offer}.

PERSONALITY RULES — follow these exactly:
- Write like a real human. Short sentences. Natural. Never formal.
- Max 3-4 sentences per message. Often just 1-2 sentences.
- Use contractions (don't, I've, it's, you're, we'll).
- Never say "I hope this finds you well", "I wanted to reach out", "as an AI", "as a language model".
- Never use bullet points or headers in emails. Just short paragraphs.
- Be warm and curious. Ask one question at a time.
- When giving price, be casual: "It's usually around $X depending on scope" not "The investment is..."
- If they haven't asked for price, don't mention it.
- Sound like someone who's worked with dozens of similar businesses. Reference that naturally when relevant.
- If they ask if you're real, say yes. You're a person, not a bot.
- Never be pushy. If they need time, give them time.
- Only offer to send a payment link if they explicitly say they're ready, want to go ahead, or ask how to pay.`;
}

// ─── Message classification ───────────────────────────────────────────────

type MessageIntent =
  | "interested"       // generally positive, wants to learn more
  | "asking_price"     // asks about cost/pricing
  | "ready_to_pay"     // "let's do it", "send the link", "how do I pay", "I'm in"
  | "wants_portfolio"  // "do you have examples", "can I see your work", "past clients"
  | "needs_more_info"  // has specific questions about the offer
  | "asking_timeline"  // "how long does it take"
  | "asking_process"   // "how does it work", "what's the process"
  | "objection"        // "not sure", "we tried this before", "too expensive", "already have someone"
  | "not_interested"   // "no thanks", "not for us", "unsubscribe", "remove me"
  | "neutral"          // unclear, generic reply
  | "other";

async function classifyIntent(replyText: string): Promise<MessageIntent> {
  const system = `Classify this email reply into EXACTLY ONE of these intents (return only the word):
interested | asking_price | ready_to_pay | wants_portfolio | needs_more_info | asking_timeline | asking_process | objection | not_interested | neutral | other

ready_to_pay = they explicitly say yes/let's go/send the link/how do I pay.
not_interested = clear rejection, unsubscribe, stop emailing.
objection = doubt, previous bad experience, cost concern.`;
  const text = await callGemini(system, `Email reply: "${replyText.slice(0, 600)}"`, false);
  const intents: MessageIntent[] = ["interested","asking_price","ready_to_pay","wants_portfolio","needs_more_info","asking_timeline","asking_process","objection","not_interested","neutral","other"];
  const found = intents.find((i) => text.toLowerCase().includes(i));
  return found ?? "neutral";
}

// ─── Response generators ──────────────────────────────────────────────────

async function genOutreachEmail(params: {
  leadName: string; company: string; niche: string; offer: string;
  senderName: string; hook: string; region: string;
}): Promise<{ subject: string; body: string }> {
  const persona = buildPersona(params.senderName, params.offer);
  const system = `${persona}

Write a COLD OUTREACH email. Rules:
- Subject line: max 6 words, lowercase, conversational (not salesy)
- Body: 2-3 short sentences. Just open a conversation. Don't pitch hard.
- End with ONE casual question.
- DO NOT mention price.
- DO NOT say "I'm reaching out because..."
- Use the hook naturally if it fits.
- Return JSON: {subject, body}`;

  const prompt = `Write cold email to ${params.leadName}, owner/manager at ${params.company} (${params.niche} business in ${params.region || "their city"}).
Their likely issue: ${params.hook}.
Your offer (don't push it yet): ${params.offer}.
Sender: ${params.senderName}.`;

  const text = await callGemini(system, prompt, true);
  try {
    const p = JSON.parse(text.replace(/```json|```/g, "").trim()) as { subject?: string; body?: string };
    if (p.subject && p.body) return { subject: p.subject, body: p.body };
  } catch { /* fallback */ }
  return {
    subject: `quick question about ${params.company}`,
    body: `Hi ${params.leadName.split(" ")[0]},\n\nI work with ${params.niche} businesses on ${params.offer} and noticed ${params.company} — thought it might be relevant.\n\nIs this something you're currently looking to improve?\n\n${params.senderName}`,
  };
}

async function genConversationReply(params: {
  leadName: string; company: string; niche: string; offer: string;
  senderName: string; price: number; currency: string;
  conversationHistory: string; latestReply: string; intent: MessageIntent;
  portfolioUrl?: string;
}): Promise<{ subject: string; body: string }> {
  const persona = buildPersona(params.senderName, params.offer);
  const system = `${persona}

You're replying to an ongoing email conversation. Rules:
- Keep it SHORT. 2-4 sentences max.
- Match their energy. If they're brief, be brief.
- Never sound like a sales robot.
- Don't repeat yourself from earlier messages.
- If intent is "asking_price": give a casual price range. Don't list features.
- If intent is "wants_portfolio": share the portfolio link naturally.
- If intent is "asking_timeline": give a real estimate casually.
- If intent is "asking_process": explain in 2 sentences, naturally.
- If intent is "objection": acknowledge it, don't argue. Ask what went wrong before or what their concern is.
- If intent is "interested": continue the conversation, ask about their specific situation.
- NEVER offer to send a payment link unless they ask how to pay or say they're ready.
- Return JSON: {subject, body}`;

  const prompt = `Conversation so far:
${params.conversationHistory}

Their latest reply: "${params.latestReply}"
Intent detected: ${params.intent}
${params.portfolioUrl ? `Portfolio URL to share if relevant: ${params.portfolioUrl}` : ""}

Write a natural, human reply from ${params.senderName}.`;

  const text = await callGemini(system, prompt, true);
  try {
    const p = JSON.parse(text.replace(/```json|```/g, "").trim()) as { subject?: string; body?: string };
    if (p.subject && p.body) return { subject: p.subject, body: p.body };
  } catch { /* fallback */ }
  return {
    subject: `Re: ${params.company}`,
    body: `Thanks for getting back to me. ${params.intent === "asking_price" ? `It's usually around ${params.currency} ${params.price} depending on your specific needs.` : "Happy to tell you more about how it works."}\n\nWhat's your current situation with ${params.offer.split(" ")[0]}?\n\n${params.senderName}`,
  };
}

async function genPaymentReadyReply(params: {
  leadName: string; company: string; offer: string;
  senderName: string; price: number; currency: string; paymentLink: string;
}): Promise<{ subject: string; body: string }> {
  const firstName = params.leadName.split(" ")[0];
  const body = `${firstName}, great — glad we're on the same page.

Here's the payment link to get started: ${params.paymentLink}

Once that's done I'll kick things off within 24 hours. Let me know if you have any questions before then.

${params.senderName}`;
  return { subject: `Re: ${params.offer} — payment link`, body };
}

async function genFollowUpEmail(params: {
  leadName: string; company: string; offer: string; senderName: string;
  conversationHistory: string; daysSinceLastContact: number;
}): Promise<{ subject: string; body: string }> {
  const persona = buildPersona(params.senderName, params.offer);
  const system = `${persona}

Write a short follow-up email to someone who hasn't replied. Rules:
- Max 2 sentences + question.
- Not needy. Just checking in.
- Sound like a real person, not a drip campaign.
- Reference something specific if possible.
- Return JSON: {subject, body}`;

  const prompt = `Follow up to ${params.leadName} at ${params.company}. It's been ${params.daysSinceLastContact} days since last contact about ${params.offer}. Previous messages: ${params.conversationHistory.slice(0, 300)}.`;
  const text = await callGemini(system, prompt, true);
  try {
    const p = JSON.parse(text.replace(/```json|```/g, "").trim()) as { subject?: string; body?: string };
    if (p.subject && p.body) return { subject: p.subject, body: p.body };
  } catch { /* fallback */ }
  return {
    subject: `still relevant?`,
    body: `Hey ${params.leadName.split(" ")[0]}, just circling back on this — is ${params.offer} still something worth exploring for ${params.company}?\n\n${params.senderName}`,
  };
}

// ─── Human-like delay system ─────────────────────────────────────────────

function humanDelay(): number {
  // 3-18 minutes in ms — randomised to feel natural
  const minutes = 3 + Math.random() * 15;
  return Math.floor(minutes * 60 * 1000);
}

function shouldRespondNow(step: AutoCampaignStep): boolean {
  if (!step.nextResponseAt) return true;
  return Date.now() >= new Date(step.nextResponseAt).getTime();
}

function setNextResponseTime(step: AutoCampaignStep): void {
  step.nextResponseAt = new Date(Date.now() + humanDelay()).toISOString();
}

// ─── Lead generation ─────────────────────────────────────────────────────

type RawLead = { name: string; email: string; company: string; industry: string; region: string };

async function generateLeads(niche: string, count: number, region?: string): Promise<RawLead[]> {
  const system = `You are a B2B lead intelligence engine. Generate realistic business lead profiles.
Return ONLY a valid JSON array. No markdown.
Each object: name, email, company, industry, region.
Make emails realistic (firstname.lastname@company.com or info@company.com).
Generate exactly ${count} leads.`;

  const regionClause = region ? ` in ${region}` : "";
  const text = await callGemini(system, `Generate ${count} B2B leads for this niche: "${niche}"${regionClause}.`, true);
  try {
    const arr = JSON.parse(text.replace(/```json|```/g, "").trim()) as RawLead[];
    if (Array.isArray(arr)) return arr.slice(0, count);
  } catch { /* fallback */ }
  return [];
}

// ─── Main campaign processor ─────────────────────────────────────────────

async function processCampaign(campaign: AutonomousCampaign): Promise<void> {
  const store = await readStore();
  const account = store.emailAccounts.find((a) => a.id === campaign.emailAccountId && a.userId === campaign.userId);
  if (!account) return;

  const senderName = store.users.find((u) => u.id === campaign.userId)?.name ?? "Alex";

  // Phase 1: Generate leads if none yet
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
      return d;
    });
    campaign = (await readStore()).autonomousCampaigns.find((x) => x.id === campaign.id)!;
  }

  // Phase 2: Send initial outreach — batch 5 per run
  const pendingSteps = campaign.steps.filter((s) => s.conversationState === "pending").slice(0, 5);
  for (const step of pendingSteps) {
    try {
      const { topNeed } = await detectBusinessNeeds({ company: step.company, industry: campaign.niche, niche: campaign.niche, region: campaign.region ?? "" });
      const { subject, body } = await genOutreachEmail({
        leadName: step.leadName, company: step.company, niche: campaign.niche,
        offer: campaign.offer, senderName, hook: topNeed.hook.replace("[city]", campaign.region ?? "your city").replace("[food type]", campaign.niche).replace("[food]", campaign.niche).replace("[law type]", campaign.niche).replace("[area]", campaign.region ?? "your area"),
        region: campaign.region ?? "",
      });

      await sendEmailWithAccount({
        accountId: account.id, to: step.leadEmail, subject,
        html: body.split("\n").map((l) => `<p>${l}</p>`).join(""), text: body,
      });

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
        return d;
      });
    } catch { /* skip */ }
  }

  // Phase 3: Follow up on cold leads (no reply after 3 days, max 1 follow-up)
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const coldSteps = campaign.steps.filter(
    (s) => s.conversationState === "emailed" && !s.followedUp && new Date(s.lastActionAt).getTime() < threeDaysAgo,
  ).slice(0, 3);

  for (const step of coldSteps) {
    try {
      const daysSince = Math.round((Date.now() - new Date(step.lastActionAt).getTime()) / (24 * 60 * 60 * 1000));
      const history = (step.conversationHistory ?? []).map((m) => `${m.role === "assistant" ? senderName : step.leadName}: ${m.content}`).join("\n\n");
      const { subject, body } = await genFollowUpEmail({ leadName: step.leadName, company: step.company, offer: campaign.offer, senderName, conversationHistory: history, daysSinceLastContact: daysSince });

      await sendEmailWithAccount({
        accountId: account.id, to: step.leadEmail, subject,
        html: body.split("\n").map((l) => `<p>${l}</p>`).join(""), text: body,
      });

      await updateStore((d) => {
        const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s) {
          s.followedUp = true;
          s.conversationState = "followed_up";
          s.conversationHistory = [...(s.conversationHistory ?? []), { role: "assistant", content: body, sentAt: new Date().toISOString() }];
          s.lastActionAt = new Date().toISOString();
        }
        return d;
      });
    } catch { /* skip */ }
  }

  // Phase 4: Process inbox replies and have real conversations
  const freshStore = await readStore();
  const freshCampaign = freshStore.autonomousCampaigns.find((x) => x.id === campaign.id)!;
  const activeSteps = freshCampaign.steps.filter((s) =>
    ["emailed", "followed_up", "in_conversation", "offer_made"].includes(s.conversationState ?? ""),
  );

  const inboxMessages = freshStore.inbox.filter((msg) => {
    const fromEmail = (msg.from ?? "").toLowerCase();
    return activeSteps.some((l) =>
      fromEmail.includes(l.leadEmail.toLowerCase().split("@")[0]) ||
      l.leadEmail.toLowerCase() === fromEmail,
    );
  });

  for (const msg of inboxMessages) {
    const step = activeSteps.find((l) =>
      (msg.from ?? "").toLowerCase().includes(l.leadEmail.toLowerCase().split("@")[0]) ||
      l.leadEmail.toLowerCase() === (msg.from ?? "").toLowerCase(),
    );
    if (!step) continue;

    // Already handled this message?
    const msgContent = msg.preview ?? msg.subject ?? "";
    const alreadyHandled = (step.conversationHistory ?? []).some((h) => h.role === "user" && h.content.includes(msgContent.slice(0, 50)));
    if (alreadyHandled) continue;

    // Wait for human-like delay before responding
    if (!shouldRespondNow(step)) continue;

    const intent = await classifyIntent(msgContent);

    if (intent === "not_interested") {
      await updateStore((d) => {
        const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s) { s.conversationState = "declined"; s.status = "declined"; s.lastActionAt = new Date().toISOString(); }
        return d;
      });
      continue;
    }

    // Notify owner if interested
    if (["interested", "asking_price", "ready_to_pay", "wants_portfolio"].includes(intent)) {
      await notifyInterestedReply({ clientName: step.leadName, clientEmail: step.leadEmail, company: step.company, replyText: msgContent }).catch(() => undefined);
    }

    let replyBody = "";
    let replySubject = "";

    if (intent === "ready_to_pay") {
      // Only now do we create and send the payment link
      try {
        const payment = await autoCreateAndSendPayment({
          userId: campaign.userId, emailAccountId: account.id,
          clientName: step.leadName, clientEmail: step.leadEmail,
          description: campaign.offer, amount: campaign.price, currency: campaign.currency, senderName,
        });
        const { subject, body } = await genPaymentReadyReply({ leadName: step.leadName, company: step.company, offer: campaign.offer, senderName, price: campaign.price, currency: campaign.currency, paymentLink: payment.link });
        replySubject = subject;
        replyBody = body;

        await updateStore((d) => {
          const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
          const s = c?.steps.find((x) => x.leadId === step.leadId);
          if (s) { s.conversationState = "payment_requested"; s.status = "payment_sent"; s.paymentId = payment.id; }
          return d;
        });
        await notifyPaymentLinkSent({ clientName: step.leadName, clientEmail: step.leadEmail, amount: campaign.price, currency: campaign.currency }).catch(() => undefined);
      } catch { /* skip */ }
    } else if (intent === "wants_portfolio") {
      // Generate demo portfolio and send link
      let portfolioUrl: string | undefined;
      try {
        const port = await generateAndSavePortfolio({ offer: campaign.offer, niche: campaign.niche, senderName, region: campaign.region ?? "" });
        portfolioUrl = port.url;
      } catch { /* skip */ }

      const history = (step.conversationHistory ?? []).map((m) => `${m.role === "assistant" ? senderName : step.leadName}: ${m.content}`).join("\n\n");
      const { subject, body } = await genConversationReply({ leadName: step.leadName, company: step.company, niche: campaign.niche, offer: campaign.offer, senderName, price: campaign.price, currency: campaign.currency, conversationHistory: history, latestReply: msgContent, intent, portfolioUrl });
      replySubject = subject;
      replyBody = body;
    } else {
      // Natural conversation reply
      const history = (step.conversationHistory ?? []).map((m) => `${m.role === "assistant" ? senderName : step.leadName}: ${m.content}`).join("\n\n");
      const { subject, body } = await genConversationReply({ leadName: step.leadName, company: step.company, niche: campaign.niche, offer: campaign.offer, senderName, price: campaign.price, currency: campaign.currency, conversationHistory: history, latestReply: msgContent, intent });
      replySubject = subject;
      replyBody = body;
    }

    if (replyBody) {
      try {
        await sendEmailWithAccount({
          accountId: account.id, to: step.leadEmail, subject: replySubject,
          html: replyBody.split("\n").map((l) => `<p>${l}</p>`).join(""), text: replyBody,
        });

        await updateStore((d) => {
          const c = d.autonomousCampaigns.find((x) => x.id === campaign.id);
          const s = c?.steps.find((x) => x.leadId === step.leadId);
          if (s) {
            const prevState = s.conversationState;
            if (!["payment_requested", "declined"].includes(s.conversationState ?? "")) {
              s.conversationState = intent === "asking_price" || intent === "wants_portfolio" ? "offer_made" : "in_conversation";
              s.status = "replied";
            }
            s.conversationHistory = [
              ...(s.conversationHistory ?? []),
              { role: "user", content: msgContent, sentAt: new Date().toISOString() },
              { role: "assistant", content: replyBody, sentAt: new Date().toISOString() },
            ];
            s.lastActionAt = new Date().toISOString();
            setNextResponseTime(s); // Set next human-like delay
          }
          if (c && !["payment_requested", "declined"].includes(freshCampaign.steps.find((x) => x.leadId === step.leadId)?.conversationState ?? "")) {
            c.totalReplied = (c.totalReplied || 0) + 1;
          }
          return d;
        });

        await logActivityEvent({ userId: campaign.userId, type: "outreach", title: `Auto-reply to ${step.leadName} (${intent})`, detail: `${step.company} — ${replySubject}`, status: "done" });
      } catch { /* skip */ }
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

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
    return d;
  });

  await logActivityEvent({ userId: params.userId, type: "campaign", title: `Autonomous campaign launched: ${params.name}`, detail: `${params.targetCount} ${params.niche} leads → ${params.offer} @ ${params.currency} ${params.price}`, status: "done" });
  return campaign;
}

export async function runAutonomousCampaigns(): Promise<void> {
  const store = await readStore();
  const running = (store.autonomousCampaigns ?? []).filter((c) => c.status === "running");
  for (const campaign of running) {
    await processCampaign(campaign).catch(() => undefined);
  }
}
