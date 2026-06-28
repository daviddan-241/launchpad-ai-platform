import { db } from "@workspace/db";
import { campaignsTable, leadsTable, settingsTable, activityTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { logger } from "./logger.js";

async function runScheduledCampaigns() {
  try {
    const now = new Date();
    const due = await db
      .select()
      .from(campaignsTable)
      .where(and(eq(campaignsTable.status, "scheduled"), lte(campaignsTable.scheduledAt, now)));

    for (const campaign of due) {
      try {
        const [settings] = await db
          .select()
          .from(settingsTable)
          .where(eq(settingsTable.userId, campaign.userId))
          .limit(1);

        if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
          logger.warn({ campaignId: campaign.id }, "Skipping scheduled campaign — SMTP not configured");
          continue;
        }

        let leadIds: number[] = [];
        try { leadIds = JSON.parse(campaign.leadIds); } catch { leadIds = []; }

        const allLeads = await db.select().from(leadsTable).where(eq(leadsTable.userId, campaign.userId));
        const targets = allLeads.filter((l) => leadIds.includes(l.id) && l.email);

        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          secure: settings.smtpSecure,
          auth: { user: settings.smtpUser, pass: settings.smtpPassword },
        });

        let sent = 0;
        for (const lead of targets) {
          try {
            const body = campaign.body
              .replace(/{{name}}/g, lead.name)
              .replace(/{{company}}/g, lead.company || "your company")
              .replace(/{{first_name}}/g, lead.name.split(" ")[0]);

            await transporter.sendMail({
              from: `"${campaign.fromName}" <${campaign.fromEmail}>`,
              to: lead.email!,
              subject: campaign.subject,
              html: body,
              text: body.replace(/<[^>]*>/g, ""),
            });
            sent++;
          } catch (e) {
            logger.warn({ leadId: lead.id, campaignId: campaign.id, err: e }, "Failed to send to lead");
          }
        }

        await db.update(campaignsTable).set({
          status: "sent",
          sentCount: sent,
          sentAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(campaignsTable.id, campaign.id));

        await db.insert(activityTable).values({
          userId: campaign.userId,
          type: "campaign",
          description: `Scheduled campaign "${campaign.name}" auto-sent to ${sent} leads`,
        });

        logger.info({ campaignId: campaign.id, sent }, "Scheduled campaign sent");
      } catch (err) {
        logger.error({ campaignId: campaign.id, err }, "Error running scheduled campaign");
      }
    }
  } catch (err) {
    logger.error({ err }, "Scheduler error");
  }
}

export function startScheduler() {
  logger.info("Campaign scheduler started — checking every 60s");
  runScheduledCampaigns();
  setInterval(runScheduledCampaigns, 60_000);
}
