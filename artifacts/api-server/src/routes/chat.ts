import { Router, type IRouter } from "express";
import { db, chatSessionsTable, chatMessagesTable, activityTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { chatCompletion } from "../lib/ai";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are LaunchPad AI — a sharp, no-nonsense sales and business growth assistant. 
You help founders and small agencies:
- Find and qualify leads
- Write killer cold emails and outreach sequences
- Generate MVP project ideas and proposals
- Close deals faster

Be direct, confident, and actionable. Give concrete advice, scripts, templates, and strategies. 
Do not hedge or pad your answers. If asked for an email template, give the full template.
If asked for a proposal structure, give the full structure. 
You are a senior sales and growth advisor with 20 years of experience.`;

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

    // Check session exists
    const [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    // Save user message
    await db.insert(chatMessagesTable).values({ sessionId: id, role: "user", content });

    // Get history for context
    const history = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.createdAt).limit(20);
    const messages = history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Call AI
    const aiText = await chatCompletion(messages, SYSTEM_PROMPT);

    // Save assistant message
    const [assistantMsg] = await db.insert(chatMessagesTable).values({ sessionId: id, role: "assistant", content: aiText }).returning();

    // Update session message count
    await db.update(chatSessionsTable).set({ messageCount: sql`${chatSessionsTable.messageCount} + 2` }).where(eq(chatSessionsTable.id, id));

    res.json(serializeMessage(assistantMsg));
  } catch (err) {
    req.log.error({ err }, "send message failed");
    res.status(500).json({ error: "AI response failed. Check your GROQ_API_KEY." });
  }
});

export default router;
