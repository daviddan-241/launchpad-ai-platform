import { Router } from "express";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable, settingsTable, leadsTable, campaignsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";
import { calculateLeadScore } from "../lib/scoring.js";

const router = Router();
router.use(requireAuth);

interface ChatCard {
  type: "question" | "action" | "result";
  title: string;
  options?: string[];
  field?: string;
}

async function getAIResponse(
  userMessage: string,
  sessionMessages: Array<{ role: string; content: string }>,
  settings: { openaiApiKey?: string | null } | null,
  userId: number
): Promise<{ content: string; cards: ChatCard[] | null; actionType: string | null; autoProceeds: boolean; autoProceedSeconds: number; sideEffect?: string }> {
  const msg = userMessage.toLowerCase();

  const [leadCountRow] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.userId, userId));
  const [campaignCountRow] = await db.select({ count: sql<number>`count(*)` }).from(campaignsTable).where(eq(campaignsTable.userId, userId));
  const leadCount = Number(leadCountRow?.count || 0);
  const campaignCount = Number(campaignCountRow?.count || 0);

  const systemPrompt = `You are an AI sales assistant for LeadForge — a B2B sales intelligence platform like Apollo.io.
You help users find leads globally, create email campaigns, manage their pipeline, and analyze results.
You have access to real Hunter.io, Apollo.io, and OpenAI integrations.
Current workspace: ${leadCount} leads, ${campaignCount} campaigns.
Keep responses concise, professional, and actionable. Suggest concrete next steps.
When asked to find leads, always ask for: industry, country/region, and job title.
When asked about campaigns, check if they have leads first.`;

  if (settings?.openaiApiKey) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...sessionMessages.slice(-10).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userMessage },
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.openaiApiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 600, temperature: 0.7 }),
      });

      if (response.ok) {
        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content || "";
        if (content) {
          return { content, cards: null, actionType: null, autoProceeds: false, autoProceedSeconds: 180 };
        }
      }
    } catch { /* fall through */ }
  }

  if (msg.includes("find") || msg.includes("search") || msg.includes("look for") || msg.includes("discover") || msg.includes("prospect")) {
    return {
      content: "I'll help you find qualified leads globally. Answer these quickly to target the right people:",
      cards: [
        { type: "question", title: "What industry are you targeting?", options: ["SaaS/Tech", "E-commerce", "Healthcare", "Finance/FinTech", "Marketing", "Real Estate", "Consulting", "Manufacturing", "Other"], field: "industry" },
        { type: "question", title: "Which region?", options: ["🇺🇸 USA", "🇨🇦 Canada", "🇬🇧 UK", "🇩🇪 Germany", "🇦🇺 Australia", "🇸🇬 Singapore", "🇦🇪 UAE", "🇨🇳 China", "🇮🇳 India", "🇧🇷 Brazil", "🌍 Global"], field: "country" },
        { type: "question", title: "Target job title?", options: ["CEO/Founder", "VP Sales", "CMO/Head of Marketing", "CTO", "Director", "Sales Manager", "Any senior role"], field: "title" },
      ],
      actionType: "lead_search",
      autoProceeds: true,
      autoProceedSeconds: 180,
    };
  }

  if (msg.includes("enrich") || msg.includes("score") || msg.includes("qualify")) {
    if (leadCount === 0) {
      return { content: "You don't have any leads yet. Use **Find Leads** to discover prospects first.", cards: null, actionType: null, autoProceeds: false, autoProceedSeconds: 180 };
    }
    return {
      content: `I can auto-score and enrich all ${leadCount} leads using Hunter.io and Apollo.io data. This will:\n\n1. **Auto-score** each lead based on completeness, seniority, and email confidence\n2. **Enrich** missing fields (company, LinkedIn, phone) via API\n3. **Rank** leads by score so you focus on the best ones\n\nGo to **Leads** and click **Score All** or click the spark icon next to any lead to enrich them individually.`,
      cards: [
        { type: "action", title: "Go to Leads page", options: [], field: "navigate" },
      ],
      actionType: "enrich", autoProceeds: false, autoProceedSeconds: 180,
    };
  }

  if (msg.includes("campaign") || msg.includes("email") || msg.includes("outreach") || msg.includes("send")) {
    if (leadCount === 0) {
      return { content: "To create a campaign, you'll need leads first. Go to **Leads → Find Leads** to discover prospects, then come back to create a campaign.", cards: null, actionType: null, autoProceeds: false, autoProceedSeconds: 180 };
    }
    return {
      content: `You have **${leadCount} leads** ready to contact. Let me help you craft a high-converting campaign:`,
      cards: [
        { type: "question", title: "Campaign goal?", options: ["Book a discovery call", "Introduce product/service", "Follow up (no reply)", "Share case study/ROI proof", "Event invite", "Custom pitch"], field: "goal" },
        { type: "question", title: "Email tone?", options: ["Friendly & direct", "Professional & formal", "Casual & conversational", "Value-first (lead with help)"], field: "tone" },
        { type: "question", title: "Add auto follow-up?", options: ["Yes — 3 days later", "Yes — 7 days later", "No follow-up"], field: "followup" },
      ],
      actionType: "campaign_create",
      autoProceeds: true,
      autoProceedSeconds: 180,
    };
  }

  if (msg.includes("schedule") || msg.includes("automat") || msg.includes("follow")) {
    return {
      content: `LeadForge supports automatic campaign scheduling:\n\n1. **Create a campaign** in the Campaigns tab\n2. Set a **schedule date** — the system auto-sends at that time\n3. Add a **follow-up sequence** (3 or 7 days later) for non-responders\n\nThe background scheduler runs every 60 seconds and handles all sending automatically.`,
      cards: null, actionType: null, autoProceeds: false, autoProceedSeconds: 180,
    };
  }

  if (msg.includes("status") || msg.includes("how many") || msg.includes("stats") || msg.includes("overview") || msg.includes("pipeline")) {
    const [newLeads] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(and(eq(leadsTable.userId, userId), eq(leadsTable.status, "new")));
    const [qualified] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(and(eq(leadsTable.userId, userId), eq(leadsTable.status, "qualified")));
    return {
      content: `Here's your live workspace stats:\n\n📊 **Leads:** ${leadCount} total · ${Number(newLeads?.count || 0)} new · ${Number(qualified?.count || 0)} qualified\n📧 **Campaigns:** ${campaignCount} total\n\nCheck the **Analytics** page for full charts and breakdowns.`,
      cards: null, actionType: "status", autoProceeds: false, autoProceedSeconds: 180,
    };
  }

  if (msg.includes("setting") || msg.includes("api key") || msg.includes("smtp") || msg.includes("openai") || msg.includes("hunter") || msg.includes("apollo")) {
    return {
      content: `To unlock all LeadForge features, add your API keys in **Settings**:\n\n🔑 **Hunter.io** — Email discovery & verification\n🔑 **Apollo.io** — 200M+ contact database\n🔑 **OpenAI** — AI-powered responses (you're using this now)\n🔑 **Google Search** — Broader web lead discovery\n📧 **SMTP** — Real email sending (Gmail, SendGrid, Mailgun)\n\nAll keys are encrypted and never exposed.`,
      cards: null, actionType: null, autoProceeds: false, autoProceedSeconds: 180,
    };
  }

  if (msg.includes("help") || msg.includes("what can") || msg.includes("how") || msg === "hi" || msg === "hello" || msg.length < 10) {
    return {
      content: `Welcome to **LeadForge AI** — your B2B sales copilot.\n\nHere's what I can help with:\n\n🎯 **Find Leads** — Search globally by industry, country & role\n✉️ **Create Campaigns** — Build personalized email sequences\n⚡ **Enrich & Score** — Auto-qualify leads via Hunter.io/Apollo.io\n📈 **Pipeline Stats** — Live dashboard insights\n⏰ **Auto-Schedule** — Send campaigns automatically\n\nWhat would you like to do?`,
      cards: [
        { type: "action", title: "🎯 Find new leads globally", options: [], field: "action" },
        { type: "action", title: "✉️ Create an email campaign", options: [], field: "action" },
        { type: "action", title: "⚡ Enrich & score my leads", options: [], field: "action" },
        { type: "action", title: "📈 Show my pipeline stats", options: [], field: "action" },
      ],
      actionType: null, autoProceeds: false, autoProceedSeconds: 180,
    };
  }

  return {
    content: `Got it! You currently have **${leadCount} leads** and **${campaignCount} campaigns**.\n\nWhat would you like to work on?`,
    cards: [
      { type: "action", title: "Find qualified leads", options: [], field: "action" },
      { type: "action", title: "Launch an email campaign", options: [], field: "action" },
      { type: "action", title: "Check pipeline stats", options: [], field: "action" },
    ],
    actionType: null, autoProceeds: false, autoProceedSeconds: 180,
  };
}

function serializeMessage(m: typeof chatMessagesTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString() };
}

router.get("/sessions", async (req: AuthRequest, res) => {
  try {
    const sessions = await db.select().from(chatSessionsTable)
      .where(eq(chatSessionsTable.userId, req.userId!))
      .orderBy(sql`${chatSessionsTable.updatedAt} desc`);
    res.json(sessions.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/sessions", async (req: AuthRequest, res) => {
  try {
    const { title } = req.body as { title: string };
    const [session] = await db.insert(chatSessionsTable).values({
      userId: req.userId!, title: title || "New conversation",
    }).returning();
    res.status(201).json({ ...session, createdAt: session.createdAt.toISOString(), updatedAt: session.updatedAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions/:id/messages", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [session] = await db.select().from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.id, id), eq(chatSessionsTable.userId, req.userId!))).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }
    const messages = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.createdAt);
    res.json(messages.map(serializeMessage));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/sessions/:id/messages", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [session] = await db.select().from(chatSessionsTable)
      .where(and(eq(chatSessionsTable.id, id), eq(chatSessionsTable.userId, req.userId!))).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }

    const { content } = req.body as { content: string };
    const [userMsg] = await db.insert(chatMessagesTable).values({
      sessionId: id, role: "user", content,
    }).returning();

    const history = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.createdAt);

    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);
    const aiResp = await getAIResponse(content, history.map(m => ({ role: m.role, content: m.content })), settings, req.userId!);

    const [assistantMsg] = await db.insert(chatMessagesTable).values({
      sessionId: id,
      role: "assistant",
      content: aiResp.content,
      cards: aiResp.cards ? JSON.stringify(aiResp.cards) : null,
      actionType: aiResp.actionType,
    }).returning();

    await db.update(chatSessionsTable).set({
      messageCount: session.messageCount + 2,
      updatedAt: new Date(),
    }).where(eq(chatSessionsTable.id, id));

    res.json({
      userMessage: serializeMessage(userMsg),
      assistantMessage: serializeMessage(assistantMsg),
      autoProceeds: aiResp.autoProceeds,
      autoProceedSeconds: aiResp.autoProceedSeconds,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
