import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable, leadsTable, settingsTable, activityTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";
import nodemailer from "nodemailer";

const router = Router();
router.use(requireAuth);

function serializeCampaign(c: typeof campaignsTable.$inferSelect) {
  let leadIds: number[] = [];
  try { leadIds = JSON.parse(c.leadIds); } catch { leadIds = []; }
  return {
    id: c.id, userId: c.userId, name: c.name, subject: c.subject, body: c.body,
    fromName: c.fromName, fromEmail: c.fromEmail, status: c.status,
    leadIds, sentCount: c.sentCount, openCount: c.openCount, replyCount: c.replyCount,
    scheduledAt: c.scheduledAt?.toISOString() || null,
    sentAt: c.sentAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable)
      .where(eq(campaignsTable.userId, req.userId!))
      .orderBy(sql`${campaignsTable.createdAt} desc`);
    res.json(campaigns.map(serializeCampaign));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { name, subject, body, fromName, fromEmail, leadIds = [], scheduledAt, followUpDays, followUpSubject, followUpBody } = req.body as {
      name: string; subject: string; body: string; fromName: string; fromEmail: string;
      leadIds?: number[]; scheduledAt?: string;
      followUpDays?: number; followUpSubject?: string; followUpBody?: string;
    };

    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);
    const resolvedFrom = fromName || settings?.defaultFromName || "";
    const resolvedFromEmail = fromEmail || settings?.defaultFromEmail || "";

    const [campaign] = await db.insert(campaignsTable).values({
      userId: req.userId!, name, subject, body,
      fromName: resolvedFrom, fromEmail: resolvedFromEmail,
      leadIds: JSON.stringify(leadIds),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "scheduled" : "draft",
    }).returning();

    if (followUpDays && followUpSubject && followUpBody && scheduledAt) {
      const followUpDate = new Date(scheduledAt);
      followUpDate.setDate(followUpDate.getDate() + followUpDays);
      await db.insert(campaignsTable).values({
        userId: req.userId!,
        name: `${name} — Follow-up`,
        subject: followUpSubject,
        body: followUpBody,
        fromName: resolvedFrom,
        fromEmail: resolvedFromEmail,
        leadIds: JSON.stringify(leadIds),
        scheduledAt: followUpDate,
        status: "scheduled",
      });
    }

    res.status(201).json(serializeCampaign(campaign));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [campaign] = await db.select().from(campaignsTable)
      .where(and(eq(campaignsTable.id, id), eq(campaignsTable.userId, req.userId!))).limit(1);
    if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
    res.json(serializeCampaign(campaign));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) update.name = body.name;
    if (body.subject !== undefined) update.subject = body.subject;
    if (body.body !== undefined) update.body = body.body;
    if (body.fromName !== undefined) update.fromName = body.fromName;
    if (body.fromEmail !== undefined) update.fromEmail = body.fromEmail;
    if (body.status !== undefined) update.status = body.status;
    if (body.leadIds !== undefined) update.leadIds = JSON.stringify(body.leadIds);
    if (body.scheduledAt !== undefined) {
      update.scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : null;
      if (body.scheduledAt && body.status === undefined) update.status = "scheduled";
    }

    const [campaign] = await db.update(campaignsTable).set(update)
      .where(and(eq(campaignsTable.id, id), eq(campaignsTable.userId, req.userId!))).returning();
    if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
    res.json(serializeCampaign(campaign));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(campaignsTable).where(and(eq(campaignsTable.id, id), eq(campaignsTable.userId, req.userId!)));
    res.json({ success: true, message: "Campaign deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/send", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [campaign] = await db.select().from(campaignsTable)
      .where(and(eq(campaignsTable.id, id), eq(campaignsTable.userId, req.userId!))).limit(1);
    if (!campaign) { res.status(404).json({ error: "Not found" }); return; }

    let leadIds: number[] = [];
    try { leadIds = JSON.parse(campaign.leadIds); } catch { leadIds = []; }

    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);

    if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
      res.status(400).json({ error: "SMTP settings not configured. Please set up your email in Settings first." });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: settings.smtpPassword },
    });

    await transporter.verify().catch(() => {
      throw new Error("SMTP connection failed. Check your credentials in Settings.");
    });

    const leads = await db.select().from(leadsTable).where(eq(leadsTable.userId, req.userId!));
    const targetLeads = leads.filter(l => leadIds.includes(l.id) && l.email);

    if (targetLeads.length === 0) {
      res.status(400).json({ error: "No leads with email addresses found in this campaign." });
      return;
    }

    let sent = 0;
    const errors: string[] = [];

    for (const lead of targetLeads) {
      try {
        const personalizedBody = campaign.body
          .replace(/{{name}}/g, lead.name)
          .replace(/{{company}}/g, lead.company || "your company")
          .replace(/{{first_name}}/g, lead.name.split(" ")[0])
          .replace(/{{title}}/g, lead.title || "")
          .replace(/{{industry}}/g, lead.industry || "");

        const personalizedSubject = campaign.subject
          .replace(/{{name}}/g, lead.name)
          .replace(/{{company}}/g, lead.company || "your company")
          .replace(/{{first_name}}/g, lead.name.split(" ")[0]);

        await transporter.sendMail({
          from: `"${campaign.fromName}" <${campaign.fromEmail}>`,
          to: `"${lead.name}" <${lead.email!}>`,
          subject: personalizedSubject,
          html: personalizedBody,
          text: personalizedBody.replace(/<[^>]*>/g, ""),
        });
        sent++;
      } catch (e) {
        errors.push(`Failed to send to ${lead.email}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    await db.update(campaignsTable).set({
      status: "sent",
      sentCount: sent,
      sentAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(campaignsTable.id, id));

    await db.insert(activityTable).values({
      userId: req.userId!,
      type: "campaign",
      description: `Campaign "${campaign.name}" sent to ${sent} of ${targetLeads.length} leads`,
    });

    res.json({ sent, failed: errors.length, total: targetLeads.length, errors });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.post("/:id/schedule", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { scheduledAt } = req.body as { scheduledAt: string };
    if (!scheduledAt) { res.status(400).json({ error: "scheduledAt is required" }); return; }

    const [campaign] = await db.update(campaignsTable).set({
      scheduledAt: new Date(scheduledAt),
      status: "scheduled",
      updatedAt: new Date(),
    }).where(and(eq(campaignsTable.id, id), eq(campaignsTable.userId, req.userId!))).returning();

    if (!campaign) { res.status(404).json({ error: "Not found" }); return; }

    await db.insert(activityTable).values({
      userId: req.userId!,
      type: "campaign",
      description: `Campaign "${campaign.name}" scheduled for ${new Date(scheduledAt).toLocaleString()}`,
    });

    res.json(serializeCampaign(campaign));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
