import { logActivityEvent } from "@/lib/activity";
import { sendEmailWithAccount } from "@/lib/email";
import { autoCreateAndSendPayment } from "@/lib/payments";
import { createId, readStore, updateStore, type AutonomousCampaign, type AutoCampaignStep } from "@/lib/store";

// ─── AI helpers ────────────────────────────────────────────────────────────

async function callAI(systemPrompt: string, userPrompt: string, json = false): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (geminiKey) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.55,
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    if (resp.ok) {
      const payload = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (text) return text;
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (groqKey) {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (resp.ok) {
      const payload = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
      if (text) return text;
    }
  }

  return "";
}

// ─── Lead generation ────────────────────────────────────────────────────────

type RawLead = {
  name: string;
  email: string;
  company: string;
  title: string;
  industry: string;
  region: string;
  painPoint: string;
};

async function generateLeads(niche: string, count: number, region?: string): Promise<RawLead[]> {
  const system = [
    "You are a B2B lead intelligence engine.",
    "Generate realistic, specific business lead profiles matching the user's niche.",
    "Return ONLY a valid JSON array. No markdown, no explanation.",
    `Each object must have: name, email, company, title, industry, region, painPoint.`,
    "Make names, companies, and emails realistic. Email format: firstname.lastname@company.com or info@company.com.",
    "painPoint should be a specific business problem they likely have that the offer solves.",
  ].join(" ");

  const regionClause = region ? ` in ${region}` : "";
  const prompt = `Generate ${count} realistic B2B leads for this niche: "${niche}"${regionClause}. Return a JSON array of ${count} lead objects.`;

  const text = await callAI(system, prompt, true);
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(cleaned) as RawLead[];
    if (Array.isArray(arr)) return arr.slice(0, count);
  } catch {
    // fallback: generate minimal leads
  }
  return [];
}

// ─── Email generation ────────────────────────────────────────────────────────

async function generateOutreachEmail(
  lead: RawLead,
  offer: string,
  price: number,
  currency: string,
  senderName: string,
): Promise<{ subject: string; body: string }> {
  const system = [
    "You are an expert cold email copywriter.",
    "Write short, human, personalized cold emails that get replies.",
    "No buzzwords. No fluff. Be specific to their business pain.",
    "Email must be under 150 words.",
    "Include a clear single CTA — reply to this email.",
    "Return JSON with keys: subject, body.",
  ].join(" ");

  const prompt = `Write a cold email to ${lead.name}, ${lead.title} at ${lead.company} (${lead.industry}, ${lead.region}).
Their pain point: ${lead.painPoint}.
Offer: ${offer} for ${currency} ${price}.
Sender name: ${senderName}.
Return JSON {subject, body}.`;

  const text = await callAI(system, prompt, true);
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
    if (parsed.subject && parsed.body) return { subject: parsed.subject, body: parsed.body };
  } catch {
    // fallback
  }

  return {
    subject: `Quick question about ${lead.company}`,
    body: `Hi ${lead.name.split(" ")[0]},\n\nI noticed ${lead.company} could benefit from ${offer}. We help ${lead.industry} businesses solve exactly this — typical results within 2 weeks.\n\nWould it make sense to connect? Happy to show you how it works in a quick reply.\n\n${senderName}`,
  };
}

// ─── Follow-up generation ─────────────────────────────────────────────────

async function generateFollowUpEmail(
  lead: AutoCampaignStep,
  offer: string,
  senderName: string,
): Promise<{ subject: string; body: string }> {
  const system = [
    "You are writing a short, friendly follow-up to a cold email that got no reply.",
    "Keep it under 80 words. Be human, not pushy.",
    "Reference the original offer briefly.",
    "Return JSON with keys: subject, body.",
  ].join(" ");

  const prompt = `Write a follow-up email to ${lead.leadName} at ${lead.company}. Offer: ${offer}. Sender: ${senderName}. Return JSON {subject, body}.`;
  const text = await callAI(system, prompt, true);
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
    if (parsed.subject && parsed.body) return { subject: parsed.subject, body: parsed.body };
  } catch { /* fallback */ }
  return {
    subject: `Re: ${offer}`,
    body: `Hi ${lead.leadName.split(" ")[0]},\n\nJust circling back — wanted to make sure my last email didn't get buried.\n\nStill happy to help with ${offer}. Even a quick reply to let me know if it's relevant would be great.\n\n${senderName}`,
  };
}

// ─── Reply classification ─────────────────────────────────────────────────

async function classifyReply(replyText: string): Promise<"interested" | "not_interested" | "needs_more_info" | "unknown"> {
  const system = `Classify this email reply as: "interested" (wants to proceed, asks about price, says yes), "not_interested" (no thanks, unsubscribe, not relevant), "needs_more_info" (has questions, wants to know more), or "unknown". Return ONLY one of those four words.`;
  const text = await callAI(system, `Email reply: "${replyText.slice(0, 500)}"`, false);
  const clean = text.trim().toLowerCase();
  if (clean.includes("interested") && !clean.includes("not_interested")) return "interested";
  if (clean.includes("not_interested") || clean.includes("not interested")) return "not_interested";
  if (clean.includes("needs_more_info") || clean.includes("more info")) return "needs_more_info";
  return "unknown";
}

async function generateInterestReply(
  lead: AutoCampaignStep,
  offer: string,
  price: number,
  currency: string,
  paymentLink: string,
  senderName: string,
): Promise<{ subject: string; body: string }> {
  const body = `Hi ${lead.leadName.split(" ")[0]},

Great to hear from you! Here's everything you need to get started:

Offer: ${offer}
Investment: ${currency} ${price.toLocaleString()}
Payment link: ${paymentLink}

Once payment is confirmed I'll kick things off within 24 hours.

Looking forward to working with you.

${senderName}`;

  return { subject: `Re: ${offer} — payment link`, body };
}

async function generateInfoReply(
  lead: AutoCampaignStep,
  offer: string,
  price: number,
  currency: string,
  senderName: string,
  replyText: string,
): Promise<{ subject: string; body: string }> {
  const system = [
    "You are a helpful salesperson answering a prospect's questions via email.",
    "Be concise, specific, and end with a clear next step.",
    "Under 120 words.",
    "Return JSON {subject, body}.",
  ].join(" ");

  const prompt = `The prospect ${lead.leadName} at ${lead.company} replied to your email about "${offer}" (${currency} ${price}). Their reply: "${replyText.slice(0, 300)}". Write a helpful, confident response that answers their question and moves toward a yes. Sender: ${senderName}. Return JSON {subject, body}.`;
  const text = await callAI(system, prompt, true);
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
    if (parsed.subject && parsed.body) return { subject: parsed.subject, body: parsed.body };
  } catch { /* fallback */ }
  return {
    subject: `Re: ${offer}`,
    body: `Hi ${lead.leadName.split(" ")[0]},\n\nThanks for getting back to me. Happy to answer any questions — ${offer} includes everything needed to get you results fast, for ${currency} ${price}. What else can I clarify for you?\n\n${senderName}`,
  };
}

// ─── Core campaign processor ───────────────────────────────────────────────

async function processCampaign(campaign: AutonomousCampaign, userId: string) {
  const store = await readStore();
  const account = store.emailAccounts.find((a) => a.id === campaign.emailAccountId && a.userId === userId);
  if (!account) return;

  const senderName = store.users.find((u) => u.id === userId)?.name ?? "The team";

  // Phase 1: Generate leads if none yet
  if (campaign.steps.length === 0) {
    const rawLeads = await generateLeads(campaign.niche, campaign.targetCount, campaign.region);
    if (rawLeads.length === 0) return;

    const steps: AutoCampaignStep[] = rawLeads.map((l) => ({
      leadId: createId("ALD"),
      leadName: l.name,
      leadEmail: l.email,
      company: l.company,
      status: "pending",
      lastActionAt: new Date().toISOString(),
    }));

    await updateStore((draft) => {
      const c = draft.autonomousCampaigns.find((x) => x.id === campaign.id);
      if (c) { c.steps = steps; c.updatedAt = new Date().toISOString(); }
      return draft;
    });
    campaign = (await readStore()).autonomousCampaigns.find((x) => x.id === campaign.id)!;
  }

  // Phase 2: Send initial outreach to pending leads (batch 5 at a time per run)
  const pending = campaign.steps.filter((s) => s.status === "pending").slice(0, 5);
  for (const step of pending) {
    try {
      const { subject, body } = await generateOutreachEmail(
        { name: step.leadName, email: step.leadEmail, company: step.company, title: "Business Owner", industry: campaign.niche, region: campaign.region ?? "", painPoint: "" },
        campaign.offer, campaign.price, campaign.currency, senderName,
      );

      await sendEmailWithAccount({
        accountId: account.id,
        to: step.leadEmail,
        subject,
        html: body.split("\n").map((l) => `<p>${l}</p>`).join(""),
        text: body,
      });

      await updateStore((draft) => {
        const c = draft.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s) { s.status = "emailed"; s.lastActionAt = new Date().toISOString(); }
        if (c) { c.totalEmailed = (c.totalEmailed || 0) + 1; c.updatedAt = new Date().toISOString(); }
        return draft;
      });

      await logActivityEvent({ userId, type: "outreach", title: `Auto-sent to ${step.leadName} at ${step.company}`, detail: subject, status: "done" });
    } catch { /* skip failed send */ }
  }

  // Phase 3: Follow up on emailed leads with no reply after 3 days
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const coldLeads = campaign.steps.filter(
    (s) => s.status === "emailed" && new Date(s.lastActionAt).getTime() < threeDaysAgo,
  ).slice(0, 3);

  for (const step of coldLeads) {
    try {
      const { subject, body } = await generateFollowUpEmail(step, campaign.offer, senderName);
      await sendEmailWithAccount({
        accountId: account.id,
        to: step.leadEmail,
        subject,
        html: body.split("\n").map((l) => `<p>${l}</p>`).join(""),
        text: body,
      });
      await updateStore((draft) => {
        const c = draft.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === step.leadId);
        if (s) { s.status = "followed_up"; s.lastActionAt = new Date().toISOString(); }
        return draft;
      });
    } catch { /* skip */ }
  }

  // Phase 4: Check inbox for replies from campaign leads and auto-respond
  const emailedLeads = campaign.steps.filter((s) => ["emailed", "followed_up"].includes(s.status));
  const inboxMessages = store.inbox.filter((msg) => {
    const fromEmail = msg.from?.toLowerCase() ?? "";
    return emailedLeads.some((l) => l.leadEmail.toLowerCase() === fromEmail || fromEmail.includes(l.company.toLowerCase().split(" ")[0]));
  });

  for (const msg of inboxMessages) {
    const matchedStep = emailedLeads.find(
      (l) => msg.from?.toLowerCase().includes(l.leadEmail.toLowerCase().split("@")[0]) ||
             msg.from?.toLowerCase().includes(l.company.toLowerCase().split(" ")[0]),
    );
    if (!matchedStep || matchedStep.status === "replied" || matchedStep.status === "interested" || matchedStep.status === "payment_sent") continue;

    const classification = await classifyReply(msg.preview ?? msg.subject ?? "");

    if (classification === "interested") {
      try {
        const payment = await autoCreateAndSendPayment({
          userId,
          emailAccountId: account.id,
          clientName: matchedStep.leadName,
          clientEmail: matchedStep.leadEmail,
          description: campaign.offer,
          amount: campaign.price,
          currency: campaign.currency,
          senderName,
        });

        const { subject, body } = await generateInterestReply(
          matchedStep, campaign.offer, campaign.price, campaign.currency, payment.link, senderName,
        );
        await sendEmailWithAccount({
          accountId: account.id, to: matchedStep.leadEmail,
          subject, html: body.split("\n").map((l) => `<p>${l}</p>`).join(""), text: body,
        });

        await updateStore((draft) => {
          const c = draft.autonomousCampaigns.find((x) => x.id === campaign.id);
          const s = c?.steps.find((x) => x.leadId === matchedStep.leadId);
          if (s) { s.status = "payment_sent"; s.paymentId = payment.id; s.replyText = msg.preview; s.lastActionAt = new Date().toISOString(); }
          if (c) { c.totalReplied = (c.totalReplied || 0) + 1; c.updatedAt = new Date().toISOString(); }
          return draft;
        });

        await logActivityEvent({ userId, type: "payment", title: `Auto-payment sent to ${matchedStep.leadName}`, detail: `${campaign.currency} ${campaign.price} — ${campaign.offer}`, status: "done" });
      } catch { /* skip */ }
    } else if (classification === "needs_more_info") {
      try {
        const { subject, body } = await generateInfoReply(
          matchedStep, campaign.offer, campaign.price, campaign.currency, senderName, msg.preview ?? "",
        );
        await sendEmailWithAccount({
          accountId: account.id, to: matchedStep.leadEmail,
          subject, html: body.split("\n").map((l) => `<p>${l}</p>`).join(""), text: body,
        });
        await updateStore((draft) => {
          const c = draft.autonomousCampaigns.find((x) => x.id === campaign.id);
          const s = c?.steps.find((x) => x.leadId === matchedStep.leadId);
          if (s) { s.status = "replied"; s.replyText = msg.preview; s.lastActionAt = new Date().toISOString(); }
          if (c) { c.totalReplied = (c.totalReplied || 0) + 1; c.updatedAt = new Date().toISOString(); }
          return draft;
        });
      } catch { /* skip */ }
    } else if (classification === "not_interested") {
      await updateStore((draft) => {
        const c = draft.autonomousCampaigns.find((x) => x.id === campaign.id);
        const s = c?.steps.find((x) => x.leadId === matchedStep.leadId);
        if (s) { s.status = "declined"; s.lastActionAt = new Date().toISOString(); }
        return draft;
      });
    }
  }

  // Check if campaign is complete (all leads processed)
  const freshStore = await readStore();
  const freshCampaign = freshStore.autonomousCampaigns.find((x) => x.id === campaign.id);
  if (!freshCampaign) return;

  const allDone = freshCampaign.steps.every((s) =>
    ["payment_sent", "paid", "declined", "followed_up"].includes(s.status),
  );
  const allEmailed = freshCampaign.steps.every((s) => s.status !== "pending");

  if (allDone && allEmailed) {
    await updateStore((draft) => {
      const c = draft.autonomousCampaigns.find((x) => x.id === campaign.id);
      if (c) { c.status = "completed"; c.completedAt = new Date().toISOString(); c.updatedAt = new Date().toISOString(); }
      return draft;
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function launchAutonomousCampaign(params: {
  userId: string;
  name: string;
  niche: string;
  offer: string;
  price: number;
  currency: string;
  targetCount: number;
  region?: string;
  emailAccountId: string;
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

  await updateStore((draft) => {
    if (!draft.autonomousCampaigns) draft.autonomousCampaigns = [];
    draft.autonomousCampaigns.unshift(campaign);
    return draft;
  });

  await logActivityEvent({
    userId: params.userId,
    type: "campaign",
    title: `Launched autonomous campaign: ${params.name}`,
    detail: `Finding ${params.targetCount} ${params.niche} leads and pitching ${params.offer} at ${params.currency} ${params.price}`,
    status: "done",
  });

  return campaign;
}

export async function runAutonomousCampaigns(): Promise<void> {
  const store = await readStore();
  const running = (store.autonomousCampaigns ?? []).filter((c) => c.status === "running");
  for (const campaign of running) {
    await processCampaign(campaign, campaign.userId).catch(() => undefined);
  }
}
