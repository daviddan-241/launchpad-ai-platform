import { Router, type IRouter } from "express";
import { db, chatSessionsTable, chatMessagesTable, leadsTable, campaignsTable, projectsTable, activityTable, agentTasksTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { chatCompletion } from "../lib/ai";
import { parseAgentCommand, executeAgentPlan } from "../lib/agent";

const router: IRouter = Router();

// Detect if a message looks like an agent command (not a chat question)
function isAgentCommand(content: string): boolean {
  const lower = content.toLowerCase();
  const agentKeywords = [
    "get business", "find business", "find companies", "get companies",
    "start sending", "send email", "reach out", "outreach",
    "generate everything", "discover leads", "find leads",
    "follow up", "follow-up", "schedule",
    "respond to", "reply to", "auto reply",
  ];
  return agentKeywords.some(k => lower.includes(k)) && content.length > 30;
}

async function buildSystemPrompt(): Promise<string> {
  const [leadsRow] = await db.select({ count: sql<number>`count(*)::int`, hot: sql<number>`count(*) filter (where status in ('Hot','Warm'))::int` }).from(leadsTable);
  const [campaignRow] = await db.select({ count: sql<number>`count(*)::int`, sent: sql<number>`coalesce(sum(sent_count),0)::int` }).from(campaignsTable);
  const [projectRow] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable);
  const recentLeads = await db.select({ name: leadsTable.companyName, status: leadsTable.status, score: leadsTable.score, industry: leadsTable.industry, email: leadsTable.email }).from(leadsTable).orderBy(desc(leadsTable.createdAt)).limit(8);
  const recentActivity = await db.select({ description: activityTable.description, type: activityTable.type }).from(activityTable).orderBy(desc(activityTable.createdAt)).limit(8);

  const context = `
LIVE PLATFORM DATA:
- Leads: ${leadsRow?.count ?? 0} total (${leadsRow?.hot ?? 0} hot/warm)
- Campaigns: ${campaignRow?.count ?? 0} total, ${campaignRow?.sent ?? 0} emails sent
- Projects: ${projectRow?.count ?? 0}
- Recent leads: ${recentLeads.map(l => `${l.name} (${l.status}, score ${l.score}, ${l.industry}${l.email ? ", has email" : ", no email"})`).join("; ")}
- Recent activity: ${recentActivity.map(a => a.description).join("; ")}
`;

  return `You are Dave — LaunchPad's AI sales agent. You're a sharp, direct, professional sales executive.

${context}

CAPABILITIES (you can execute these autonomously when asked):
- Discover & save leads from any region/industry
- Generate personalized outreach emails and proposals  
- Send emails to leads automatically
- Schedule follow-up emails at specified times
- Monitor inbox and auto-reply to responses
- Push notifications to the user's phone/browser

IMPORTANT: When the user gives you a command like "get businesses in Asia and send proposals", respond with a clear ACTION PLAN describing exactly what you'll do and confirming you're starting. Be specific. Don't say "I can't" — you CAN execute these tasks.

Response style:
- Direct, professional, no fluff
- When executing tasks: give a numbered action plan first, then confirm you're starting
- Reference their actual data when relevant
- Short paragraphs, never lists of bullet points for conversational replies
- Sign off with "— Dave" when appropriate`;
}

function serializeSession(s: typeof chatSessionsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt?.toISOString() ?? null };
}
function serializeMessage(m: typeof chatMessagesTable.$inferSelect & { taskId?: number; isAgentCommand?: boolean }) {
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
    res.status(201).json(serializeSession(session));
  } catch (err) {
    req.log.error({ err }, "create session failed");
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/chat/sessions/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    const messages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.createdAt);
    res.json({ ...serializeSession(session), messages: messages.map(m => serializeMessage(m as any)) });
  } catch (err) {
    req.log.error({ err }, "get session failed");
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.delete("/chat/sessions/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "content required" }); return; }

    const [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, id));
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    await db.insert(chatMessagesTable).values({ sessionId: id, role: "user", content });

    const systemPrompt = await buildSystemPrompt();
    const history = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.sessionId, id)).orderBy(chatMessagesTable.createdAt).limit(20);
    const messages = history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    let aiText: string;
    let taskId: number | undefined;

    // If this is an agent command, parse + execute it AND generate a response
    if (isAgentCommand(content)) {
      const plan = await parseAgentCommand(content);

      // Create the agent task
      const [task] = await db.insert(agentTasksTable).values({
        command: content.trim(),
        status: "running",
        plan,
        progress: [{ step: `🧠 Understood: ${plan.intent}`, status: "done", time: new Date().toISOString() }],
        sessionId: id,
      }).returning();
      taskId = task.id;

      // Run in background
      executeAgentPlan(task.id, plan).catch(err => req.log.error({ err }, "agent task failed"));

      // Generate a response that describes the action plan
      const planContext = `The user gave an agent command. You are NOW EXECUTING this plan:
Intent: ${plan.intent}
Actions: ${plan.actions.map(a => `${a.type}: ${a.description}`).join(", ")}
Targets: ${JSON.stringify(plan.targets)}
Service: ${plan.service}
Follow-up delay: ${plan.followUpDelayMinutes} minutes
Auto-reply: ${plan.autoReply}

TASK ID: ${task.id} (user can track progress)

Respond in first person as Dave. Confirm you're executing the plan NOW. Give a numbered action plan. Be specific about what you're doing. End with "I'll notify you when each step is complete."`;

      aiText = await chatCompletion([...messages, { role: "user", content: planContext }], systemPrompt);
      aiText = aiText + `\n\n*Task ID: #${task.id} — tracking progress in background*`;
    } else {
      aiText = await chatCompletion(messages, systemPrompt);
    }

    const [assistantMsg] = await db.insert(chatMessagesTable).values({ sessionId: id, role: "assistant", content: aiText }).returning();
    await db.update(chatSessionsTable).set({ messageCount: sql`${chatSessionsTable.messageCount} + 2` }).where(eq(chatSessionsTable.id, id));

    res.json({ ...serializeMessage(assistantMsg as any), taskId });
  } catch (err) {
    req.log.error({ err }, "send message failed");
    res.status(500).json({ error: "AI response failed. Check GROQ_API_KEY." });
  }
});

export default router;
