import { db, scheduledJobsTable, pushSubscriptionsTable, activityTable, leadsTable } from "@workspace/db";
import { eq, lte, and } from "drizzle-orm";
import { logger } from "./logger";
import { sendPushToAll } from "./push";
import { checkAndRespondToReplies } from "./imap";
import { sendEmail } from "./mailer";
import { generateText } from "./ai";

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  logger.info("Background scheduler started — checking jobs every 60s");

  setInterval(() => {
    runDueJobs().catch(err => logger.error({ err }, "scheduler tick error"));
  }, 60_000);

  // Also check IMAP replies every 5 minutes
  setInterval(() => {
    checkAndRespondToReplies().catch(err => logger.error({ err }, "imap check error"));
  }, 5 * 60_000);
}

async function runDueJobs() {
  const now = new Date();
  const jobs = await db.select().from(scheduledJobsTable)
    .where(and(eq(scheduledJobsTable.status, "pending"), lte(scheduledJobsTable.runAt, now)))
    .limit(20);

  for (const job of jobs) {
    // Mark as running
    await db.update(scheduledJobsTable).set({ status: "running", attempts: job.attempts + 1 }).where(eq(scheduledJobsTable.id, job.id));

    try {
      await executeJob(job);
      await db.update(scheduledJobsTable).set({ status: "done", ranAt: new Date() }).where(eq(scheduledJobsTable.id, job.id));
    } catch (err: any) {
      logger.error({ err, jobId: job.id, type: job.type }, "job execution failed");
      const status = job.attempts >= 2 ? "failed" : "pending";
      const nextRun = new Date(Date.now() + 5 * 60_000);
      await db.update(scheduledJobsTable).set({
        status, lastError: err?.message ?? String(err),
        runAt: nextRun,
      }).where(eq(scheduledJobsTable.id, job.id));
    }
  }
}

async function executeJob(job: typeof scheduledJobsTable.$inferSelect) {
  const payload = job.payload as Record<string, any>;
  logger.info({ jobId: job.id, type: job.type }, "executing job");

  switch (job.type) {
    case "send_followup_email": {
      const { leadId, subject, body, emailAccountId } = payload;
      const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
      if (!lead?.email) throw new Error(`Lead ${leadId} has no email`);

      const personalizedBody = body.replace(/\{\{company\}\}/gi, lead.companyName)
        .replace(/\{\{name\}\}/gi, lead.contactName ?? "there")
        .replace(/\{\{website\}\}/gi, lead.website ?? "");

      await sendEmail({ emailAccountId, to: lead.email, subject, body: personalizedBody });
      await db.insert(activityTable).values({ type: "followup_sent", description: `Follow-up sent to ${lead.companyName} (${lead.email})`, entityId: String(leadId), entityType: "lead" });
      await sendPushToAll({ title: "Follow-up Sent ✓", body: `Sent to ${lead.companyName}`, tag: `followup-${leadId}` });
      break;
    }

    case "send_campaign_email": {
      const { to, subject, body, leadId, emailAccountId } = payload;
      await sendEmail({ emailAccountId, to, subject, body });
      await db.insert(activityTable).values({ type: "campaign_email_sent", description: `Campaign email sent to ${to}`, entityId: String(leadId ?? ""), entityType: "lead" });
      break;
    }

    case "notify": {
      const { title, body: bodyText, tag } = payload;
      await sendPushToAll({ title, body: bodyText, tag });
      break;
    }

    case "check_imap": {
      await checkAndRespondToReplies();
      break;
    }

    default:
      logger.warn({ type: job.type }, "unknown job type");
  }
}

export async function scheduleJob(
  type: string,
  payload: Record<string, any>,
  runAt: Date = new Date()
) {
  const [job] = await db.insert(scheduledJobsTable).values({ type, payload, runAt, status: "pending" }).returning();
  return job;
}
