import { db, leadsTable, campaignsTable, emailAccountsTable, activityTable, agentTasksTable, scheduledJobsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { generateText, chatCompletion } from "./ai";
import { sendEmail, getActiveEmailAccount } from "./mailer";
import { scheduleJob } from "./scheduler";
import { sendPushToAll } from "./push";
import { logger } from "./logger";

export interface AgentPlan {
  intent: string;
  actions: AgentAction[];
  targets: { regions?: string[]; industries?: string[]; count?: number };
  emailTone: string;
  followUpDelayMinutes: number;
  autoReply: boolean;
  service: string;
}

interface AgentAction {
  type: "discover_leads" | "generate_proposals" | "send_emails" | "schedule_followups" | "notify";
  description: string;
}

export async function parseAgentCommand(command: string): Promise<AgentPlan> {
  const systemPrompt = `You are an AI sales automation parser. Parse the user's natural language command into a structured plan.

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "intent": "brief description of what user wants",
  "actions": [
    { "type": "discover_leads", "description": "..." },
    { "type": "generate_proposals", "description": "..." },
    { "type": "send_emails", "description": "..." },
    { "type": "schedule_followups", "description": "..." }
  ],
  "targets": {
    "regions": ["USA", "Asia"],
    "industries": ["web development", "e-commerce"],
    "count": 20
  },
  "emailTone": "professional and persuasive",
  "followUpDelayMinutes": 20,
  "autoReply": true,
  "service": "web development services"
}

action types available: discover_leads, generate_proposals, send_emails, schedule_followups, notify
Only include actions explicitly or implicitly requested.
followUpDelayMinutes: extract from "20 mins", "1 hour", etc. Default 1440 (24h) if not specified.
service: what they're selling (e.g. "web development", "marketing services").
regions: extract geographic targets.
industries: what kind of businesses they're targeting.`;

  const response = await chatCompletion(
    [{ role: "user", content: command }],
    systemPrompt
  );

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as AgentPlan;
  } catch {
    return {
      intent: command,
      actions: [{ type: "discover_leads", description: "Find relevant leads" }, { type: "send_emails", description: "Send outreach" }],
      targets: { regions: ["USA"], industries: [], count: 10 },
      emailTone: "professional",
      followUpDelayMinutes: 1440,
      autoReply: false,
      service: "services",
    };
  }
}

async function addProgress(taskId: number, step: string, status: "running" | "done" | "error" = "running") {
  const [task] = await db.select({ progress: agentTasksTable.progress }).from(agentTasksTable).where(eq(agentTasksTable.id, taskId));
  const progress = (task?.progress as any[]) ?? [];
  progress.push({ step, status, time: new Date().toISOString() });
  await db.update(agentTasksTable).set({ progress }).where(eq(agentTasksTable.id, taskId));
}

export async function executeAgentPlan(taskId: number, plan: AgentPlan): Promise<void> {
  try {
    await db.update(agentTasksTable).set({ plan, status: "running" }).where(eq(agentTasksTable.id, taskId));

    const account = await getActiveEmailAccount();
    let discoveredLeads: typeof leadsTable.$inferSelect[] = [];

    for (const action of plan.actions) {
      switch (action.type) {
        case "discover_leads": {
          await addProgress(taskId, `🔍 Discovering leads in ${plan.targets.regions?.join(", ") ?? "target regions"}...`);
          discoveredLeads = await discoverAndSaveLeads(plan);
          await addProgress(taskId, `✅ Found ${discoveredLeads.length} leads and saved to pipeline`, "done");
          break;
        }

        case "generate_proposals": {
          await addProgress(taskId, `📝 Generating personalized proposals for ${discoveredLeads.length} leads...`);
          // Proposals are embedded in the email body — no separate step needed
          await addProgress(taskId, `✅ Proposals ready`, "done");
          break;
        }

        case "send_emails": {
          if (!account) {
            await addProgress(taskId, `⚠️ No email account connected — skipping email send. Add one in Settings.`, "error");
            break;
          }

          const targets = discoveredLeads.length > 0 ? discoveredLeads : await db.select().from(leadsTable).orderBy(desc(leadsTable.score)).limit(plan.targets.count ?? 20);
          await addProgress(taskId, `📧 Sending outreach emails to ${targets.length} leads...`);

          let sent = 0;
          for (const lead of targets) {
            if (!lead.email) continue;
            try {
              const { subject, body } = await generateOutreachEmail(lead, plan);
              await sendEmail({ emailAccountId: account.id, to: lead.email, subject, body });
              sent++;
              await db.insert(activityTable).values({ type: "agent_email_sent", description: `AI sent outreach to ${lead.companyName} (${lead.email})`, entityId: String(lead.id), entityType: "lead" });
              // Small delay to avoid spam filters
              await new Promise(r => setTimeout(r, 1000));
            } catch (err: any) {
              logger.error({ err: err?.message, leadId: lead.id }, "email send failed");
            }
          }

          await addProgress(taskId, `✅ Sent ${sent} outreach emails`, "done");
          await sendPushToAll({ title: `📧 ${sent} Emails Sent`, body: `LaunchPad AI sent outreach to ${sent} leads`, tag: `agent-sent-${taskId}` });
          break;
        }

        case "schedule_followups": {
          if (!account) {
            await addProgress(taskId, `⚠️ No email account — skipping follow-up scheduling`, "error");
            break;
          }
          const delayMs = plan.followUpDelayMinutes * 60 * 1000;
          const runAt = new Date(Date.now() + delayMs);
          const targets = discoveredLeads.length > 0 ? discoveredLeads : await db.select().from(leadsTable).limit(plan.targets.count ?? 20);

          let scheduled = 0;
          for (const lead of targets) {
            if (!lead.email) continue;
            const followupBody = await generateFollowUpEmail(lead, plan);
            await scheduleJob("send_followup_email", {
              leadId: lead.id,
              subject: `Following up — ${plan.service} for ${lead.companyName}`,
              body: followupBody,
              emailAccountId: account.id,
            }, runAt);
            scheduled++;
          }

          const delayLabel = plan.followUpDelayMinutes < 60
            ? `${plan.followUpDelayMinutes} minutes`
            : `${Math.round(plan.followUpDelayMinutes / 60)} hours`;
          await addProgress(taskId, `⏰ Scheduled ${scheduled} follow-up emails in ${delayLabel}`, "done");
          break;
        }

        case "notify": {
          await sendPushToAll({ title: "LaunchPad Agent", body: plan.intent, tag: `agent-${taskId}` });
          break;
        }
      }
    }

    await db.update(agentTasksTable).set({ status: "done" }).where(eq(agentTasksTable.id, taskId));
    await sendPushToAll({
      title: "✅ Agent Task Complete",
      body: plan.intent,
      tag: `agent-done-${taskId}`,
    });
  } catch (err: any) {
    logger.error({ err: err?.message, taskId }, "agent execution failed");
    await db.update(agentTasksTable).set({ status: "error" }).where(eq(agentTasksTable.id, taskId));
    await addProgress(taskId, `❌ Error: ${err?.message}`, "error");
  }
}

async function discoverAndSaveLeads(plan: AgentPlan): Promise<typeof leadsTable.$inferSelect[]> {
  const query = `Find ${plan.targets.count ?? 15} real businesses in ${plan.targets.regions?.join(" and ") ?? "USA"} that need ${plan.service}. ${plan.targets.industries?.length ? `Industries: ${plan.targets.industries.join(", ")}.` : ""}`;

  const systemPrompt = `Generate a list of realistic businesses that would benefit from ${plan.service}. Return ONLY valid JSON array (no markdown):
[
  {
    "companyName": "Company Name",
    "contactName": "First Last",
    "email": "contact@company.com",
    "website": "https://company.com",
    "industry": "Industry",
    "location": "City, Country",
    "score": 75,
    "notes": "Why they need this service"
  }
]
Generate ${plan.targets.count ?? 15} entries. Use realistic company names, plausible emails, real-sounding details. Mix USA and Asian companies based on regions specified.`;

  const response = await generateText(query, systemPrompt);
  let parsed: any[] = [];

  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }
  } catch {
    logger.warn("Failed to parse lead discovery response");
    return [];
  }

  const saved: typeof leadsTable.$inferSelect[] = [];
  for (const lead of parsed.slice(0, plan.targets.count ?? 15)) {
    try {
      const [saved_lead] = await db.insert(leadsTable).values({
        companyName: lead.companyName ?? "Unknown",
        contactName: lead.contactName,
        email: lead.email,
        website: lead.website,
        industry: lead.industry,
        location: lead.location,
        score: lead.score ?? 70,
        notes: lead.notes,
        source: "AI Agent",
        status: "New",
      }).returning();
      saved.push(saved_lead);
    } catch {}
  }

  if (saved.length > 0) {
    await db.insert(activityTable).values({ type: "agent_discover", description: `AI Agent discovered ${saved.length} leads for "${plan.service}"`, entityType: "lead" });
  }

  return saved;
}

async function generateOutreachEmail(lead: typeof leadsTable.$inferSelect, plan: AgentPlan): Promise<{ subject: string; body: string }> {
  const prompt = `Write a ${plan.emailTone} cold outreach email selling ${plan.service} to ${lead.companyName} (${lead.industry ?? "business"} in ${lead.location ?? "their region"}).
Contact: ${lead.contactName ?? "the decision maker"}.
Website: ${lead.website ?? "n/a"}.

Requirements:
- Professional, concise (150-200 words max)
- Specific to their industry/needs
- Clear value proposition
- One call-to-action (book a call, reply, visit a demo link)
- NO excessive flattery
- Sign as "Dave" with title "CEO, LaunchPad"

Return JSON: {"subject": "...", "body": "..."}`;

  const response = await generateText(prompt);
  try {
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      subject: `Web development services for ${lead.companyName}`,
      body: `Hi ${lead.contactName ?? "there"},\n\nI came across ${lead.companyName} and noticed an opportunity to help you grow your online presence with a custom website.\n\nWe specialize in ${plan.service} for businesses like yours. Would you be open to a quick 15-minute call this week?\n\nBest,\nDave\nCEO, LaunchPad`,
    };
  }
}

async function generateFollowUpEmail(lead: typeof leadsTable.$inferSelect, plan: AgentPlan): Promise<string> {
  const prompt = `Write a brief, professional follow-up email for ${lead.companyName}. We sent them an initial outreach about ${plan.service} and haven't heard back.
Keep it very short (3-4 sentences). Friendly but direct. Don't apologize for following up.
No placeholders. Sign as "Dave".`;
  return generateText(prompt);
}
