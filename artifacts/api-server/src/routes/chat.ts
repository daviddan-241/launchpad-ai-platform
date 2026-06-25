import { Router, type IRouter } from "express";
import { db, chatSessionsTable, chatMessagesTable, leadsTable, campaignsTable, projectsTable, activityTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { chatCompletion } from "../lib/ai";

const router: IRouter = Router();

async function buildSystemPrompt(): Promise<string> {
  // Fetch live DB context so the AI can answer questions about your data
  const [leadsRow] = await db.select({ count: sql<number>`count(*)::int`, hot: sql<number>`count(*) filter (where status in ('Hot','Warm'))::int` }).from(leadsTable);
  const [campaignRow] = await db.select({ count: sql<number>`count(*)::int`, sent: sql<number>`coalesce(sum(sent_count),0)::int` }).from(campaignsTable);
  const [projectRow] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable);
  const recentLeads = await db.select({ name: leadsTable.companyName, status: leadsTable.status, score: leadsTable.score, industry: leadsTable.industry }).from(leadsTable).orderBy(desc(leadsTable.createdAt)).limit(5);
  const recentActivity = await db.select({ description: activityTable.description }).from(activityTable).orderBy(desc(activityTable.createdAt)).limit(5);

  const context = `
LIVE PLATFORM DATA (as of now):
- Total leads: ${leadsRow?.count ?? 0} (${leadsRow?.hot ?? 0} hot/warm)
- Campaigns: ${campaignRow?.count ?? 0} total, ${campaignRow?.sent ?? 0} emails sent
- MVP projects generated: ${projectRow?.count ?? 0}
- Recent leads: ${recentLeads.map(l => `${l.name} (${l.status}, score ${l.score}, ${l.industry})`).join("; ")}
- Recent activity: ${recentActivity.map(a => a.description).join("; ")}
`;

  return `You are LaunchPad AI — a sharp, direct sales and business growth advisor built into this platform.

${context}

You have full access to the user's sales data shown above. When they ask about their leads, campaigns, or projects — reference the real numbers.

You help with:
- Qualifying and prioritizing leads ("Which leads should I call first?")
- Writing cold emails and outreach scripts (give full templates, not summaries)
- Building campaign strategies
- Generating MVP project proposals and pricing
- Closing advice, objection handling, follow-up sequences

Rules:
- Be direct and concise. No fluff, no hedging.
- When asked for a template, give the COMPLETE template (not "here's an example of...")
- Reference their actual data when relevant
- Suggest actionable next steps after every response
- If they ask to create a lead, send a campaign, or generate a project — tell them to use the relevant tab in the app`;
}

function serializeSession(s: typeof chatSessionsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt?.toISOString() ?? null };
}
function serializeMessage(m: typeof chatMessagesTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString() };
}

router.get("/chat/sessions", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(chatSessionsTable).orderBy(desc(chatSessionsTable.updatedAt));
    res.json(rows.map(serializeSession));
  } catch (err) {
    req.log.error({ err }, "list sessions failed");
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.post("/chat/sessions", async (req, res): Promise<void> => {
  try {
    const { title } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const [session] = await db.insert(chatSessionsTable).values({ title }).returning();
    await db.insert(activityTable).values({ type: "chat_started", description: `New chat: "${title}"`, entityId: String(session.id), entityType: "chat" });
    res.status(201).json(serializeSession(session));
  } catch (err) {
    req.log.error({ err }, "create session failed");
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/chat/sessions/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    const messages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.createdAt);
    res.json({ ...serializeSession(session), messages: messages.map(serializeMessage) });
  } catch (err) {
    req.log.error({ err }, "get session failed");
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.delete("/chat/sessions/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id));
    await db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "delete session failed");
    res.status(500).json({ error: "Failed to delete session" });
  }
});

router.post("/chat/sessions/:id/messages", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "content required" }); return; }

    const [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    // Save user message first
    await db.insert(chatMessagesTable).values({ sessionId: id, role: "user", content });

    // Build system prompt with live DB context
    const systemPrompt = await buildSystemPrompt();

    // Get recent history (last 20 messages for context)
    const history = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.createdAt).limit(20);
    const messages = history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Get AI response
    const aiText = await chatCompletion(messages, systemPrompt);

    // Save assistant message
    const [assistantMsg] = await db.insert(chatMessagesTable).values({ sessionId: id, role: "assistant", content: aiText }).returning();

    // Update session
    await db.update(chatSessionsTable).set({ messageCount: sql`${chatSessionsTable.messageCount} + 2` }).where(eq(chatSessionsTable.id, id));

    res.json(serializeMessage(assistantMsg));
  } catch (err) {
    req.log.error({ err }, "send message failed");
    res.status(500).json({ error: "AI response failed. Check GROQ_API_KEY or OLLAMA_BASE_URL." });
  }
});

export default router;
