import { Router } from "express";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable, settingsTable, leadsTable, campaignsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";

const router = Router();
router.use(requireAuth);

interface ChatCard {
  type: "question" | "action" | "result";
  title: string;
  options?: string[];
  field?: string;
}

async function getAIResponse(userMessage: string, sessionMessages: Array<{ role: string; content: string }>, settings: { openaiApiKey?: string | null } | null, userId: number): Promise<{ content: string; cards: ChatCard[] | null; actionType: string | null; autoProceeds: boolean; autoProceedSeconds: number }> {
  const msg = userMessage.toLowerCase();

  // System prompt context
  const systemPrompt = `You are an AI sales assistant for LeadForge, a professional sales workspace. You help users:
- Find and research leads globally (USA, Canada, Asia, China, Europe, etc.)
- Create and send email campaigns
- Manage their sales pipeline
- Get insights and recommendations

When users ask to find leads, ask clarifying questions using cards. When they provide info, confirm what you'll do and let them know to check Leads page.
Keep responses concise, professional, and actionable. Always end with a clear next step or question.`;

  // Try OpenAI if key is configured
  if (settings?.openaiApiKey) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        ...sessionMessages.slice(-10).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userMessage },
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content || "";
        if (content) {
          return { content, cards: null, actionType: null, autoProceeds: false, autoProceedSeconds: 180 };
        }
      }
    } catch (e) { /* fall through */ }
  }

  // Smart rule-based responses
  const leadCount = (await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.userId, userId)))[0]?.count || 0;
  const campaignCount = (await db.select({ count: sql<number>`count(*)` }).from(campaignsTable).where(eq(campaignsTable.userId, userId)))[0]?.count || 0;

  if (msg.includes("find") || msg.includes("search") || msg.includes("look for") || msg.includes("discover")) {
    return {
      content: "I can help you find qualified leads globally. Let me ask a few quick questions to target the right people:",
      cards: [
        { type: "question", title: "What industry are you targeting?", options: ["SaaS/Tech", "E-commerce", "Healthcare", "Finance/FinTech", "Marketing", "Real Estate", "Consulting", "Other"], field: "industry" },
        { type: "question", title: "Which region?", options: ["🇺🇸 USA", "🇨🇦 Canada", "🇬🇧 UK", "🇩🇪 Germany", "🇦🇺 Australia", "🇸🇬 Singapore", "🇦🇪 UAE", "🇨🇳 China", "🇮🇳 India", "🇧🇷 Brazil", "Global"], field: "country" },
        { type: "question", title: "Job title / role?", options: ["CEO/Founder", "VP Sales", "CMO/Head of Marketing", "CTO", "Director of Ops", "Sales Manager", "Any"], field: "title" },
      ],
      actionType: "lead_search",
      autoProceeds: true,
      autoProceedSeconds: 180,
    };
  }

  if (msg.includes("campaign") || msg.includes("email") || msg.includes("outreach") || msg.includes("send")) {
    if (leadCount === 0) {
      return {
        content: "To create a campaign, you'll first need some leads. Go to **Leads → Find Leads** to discover people to reach out to. Once you have leads, I can help you craft a campaign.",
        cards: null, actionType: null, autoProceeds: false, autoProceedSeconds: 180,
      };
    }
    return {
      content: `You have ${leadCount} leads ready to contact. Let me help you build a campaign:`,
      cards: [
        { type: "question", title: "What's the goal of this campaign?", options: ["Book a discovery call", "Introduce my product/service", "Follow up after no response", "Share a case study", "Custom pitch"], field: "goal" },
        { type: "question", title: "Tone of the email?", options: ["Friendly and direct", "Professional and formal", "Casual and conversational", "Value-first (lead with help)"], field: "tone" },
      ],
      actionType: "campaign_create",
      autoProceeds: true,
      autoProceedSeconds: 180,
    };
  }

  if (msg.includes("status") || msg.includes("how many") || msg.includes("stats") || msg.includes("overview")) {
    return {
      content: `Here's your current workspace status:\n\n**Leads:** ${leadCount} total\n**Campaigns:** ${campaignCount} total\n\nHead to the Dashboard for full analytics, or ask me to help find more leads or create a campaign.`,
      cards: null, actionType: "status", autoProceeds: false, autoProceedSeconds: 180,
    };
  }

  if (msg.includes("help") || msg.includes("what can") || msg.includes("how")) {
    return {
      content: "Here's what I can do for you:\n\n1. **Find Leads** — Search globally for prospects by industry, country, and role\n2. **Create Campaigns** — Build personalized email sequences\n3. **Track Status** — Show your pipeline stats\n4. **Import Leads** — Add leads from CSV or bulk list\n\nWhat would you like to do?",
      cards: [
        { type: "action", title: "Find new leads", options: [], field: "action" },
        { type: "action", title: "Create a campaign", options: [], field: "action" },
        { type: "action", title: "Show my stats", options: [], field: "action" },
      ],
      actionType: null, autoProceeds: false, autoProceedSeconds: 180,
    };
  }

  // Default response
  return {
    content: `Got it! I'm here to help you grow your sales pipeline. You currently have **${leadCount} leads** and **${campaignCount} campaigns**.\n\nWhat would you like to work on?`,
    cards: [
      { type: "action", title: "Find qualified leads", options: [], field: "action" },
      { type: "action", title: "Launch an email campaign", options: [], field: "action" },
      { type: "action", title: "Check my pipeline stats", options: [], field: "action" },
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
      .where(eq(chatMessagesTable.sessionId, id))
      .orderBy(chatMessagesTable.createdAt);
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
      .where(eq(chatMessagesTable.sessionId, id))
      .orderBy(chatMessagesTable.createdAt);

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
