import { Router, type IRouter } from "express";
import { db, campaignsTable, emailAccountsTable, leadsTable, activityTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import nodemailer from "nodemailer";
import { generateText } from "../lib/ai";

const router: IRouter = Router();

function serializeCampaign(c: typeof campaignsTable.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt?.toISOString() ?? null, scheduledAt: c.scheduledAt?.toISOString() ?? null };
}
function serializeAccount(a: typeof emailAccountsTable.$inferSelect) {
  const { smtpPasswordEncrypted: _, ...safe } = a;
  return { ...safe, createdAt: a.createdAt.toISOString() };
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

router.get("/campaigns", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt));
    res.json(rows.map(serializeCampaign));
  } catch (err) {
    req.log.error({ err }, "list campaigns failed");
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

router.post("/campaigns", async (req, res): Promise<void> => {
  try {
    const { name, subject, body, emailAccountId, scheduledAt } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const [campaign] = await db.insert(campaignsTable).values({
      name, subject, body,
      emailAccountId: emailAccountId ? Number(emailAccountId) : null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    }).returning();
    res.status(201).json(serializeCampaign(campaign));
  } catch (err) {
    req.log.error({ err }, "create campaign failed");
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.get("/campaigns/stats", async (req, res): Promise<void> => {
  try {
    const [row] = await db.select({
      totalCampaigns: sql<number>`count(*)::int`,
      totalSent: sql<number>`coalesce(sum(sent_count),0)::int`,
      totalOpen: sql<number>`coalesce(sum(open_count),0)::int`,
      totalReply: sql<number>`coalesce(sum(reply_count),0)::int`,
    }).from(campaignsTable);
    const totalSent = Number(row?.totalSent ?? 0);
    const totalOpen = Number(row?.totalOpen ?? 0);
    const totalReply = Number(row?.totalReply ?? 0);
    res.json({
      totalCampaigns: Number(row?.totalCampaigns ?? 0),
      totalSent,
      avgOpenRate: totalSent > 0 ? Math.round((totalOpen / totalSent) * 100 * 10) / 10 : 0,
      avgReplyRate: totalSent > 0 ? Math.round((totalReply / totalSent) * 100 * 10) / 10 : 0,
    });
  } catch (err) {
    req.log.error({ err }, "campaign stats failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    res.json(serializeCampaign(campaign));
  } catch (err) {
    req.log.error({ err }, "get campaign failed");
    res.status(500).json({ error: "Failed to get campaign" });
  }
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const update: Record<string, unknown> = { ...req.body };
    if (update.scheduledAt) update.scheduledAt = new Date(update.scheduledAt as string);
    const [campaign] = await db.update(campaignsTable).set(update).where(eq(campaignsTable.id, id)).returning();
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    res.json(serializeCampaign(campaign));
  } catch (err) {
    req.log.error({ err }, "update campaign failed");
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "delete campaign failed");
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

router.post("/campaigns/:id/send", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

    // Get all leads with emails
    const leads = await db.select().from(leadsTable).where(sql`email is not null`).limit(500);

    let sent = 0;
    let failed = 0;

    if (campaign.emailAccountId) {
      // Real sending via SMTP
      const [account] = await db.select().from(emailAccountsTable).where(eq(emailAccountsTable.id, campaign.emailAccountId));
      if (account && account.smtpHost && account.smtpUser && account.smtpPasswordEncrypted) {
        const transporter = nodemailer.createTransport({
          host: account.smtpHost,
          port: account.smtpPort ?? 587,
          secure: (account.smtpPort ?? 587) === 465,
          auth: { user: account.smtpUser, pass: account.smtpPasswordEncrypted },
        });

        for (const lead of leads) {
          if (!lead.email) continue;
          try {
            await transporter.sendMail({
              from: account.email,
              to: lead.email,
              subject: campaign.subject ?? "(No subject)",
              text: campaign.body ?? "",
              html: campaign.body ? `<p>${campaign.body.replace(/\n/g, "<br>")}</p>` : "",
            });
            sent++;
          } catch {
            failed++;
          }
        }
      }
    } else {
      // No email account — return clear error, do not simulate sending
      res.status(400).json({
        error: "No email account connected",
        message: "Connect an email account in Settings before sending campaigns.",
        sent: 0,
        failed: 0,
      });
      return;
    }

    await db.update(campaignsTable).set({ status: "Sent", sentCount: sent, recipientCount: leads.length }).where(eq(campaignsTable.id, id));
    await db.insert(activityTable).values({ type: "campaign_sent", description: `Campaign "${campaign.name}" sent to ${sent} recipients`, entityId: String(id), entityType: "campaign" });

    res.json({ sent, failed, message: `Successfully sent to ${sent} recipients` });
  } catch (err) {
    req.log.error({ err }, "send campaign failed");
    res.status(500).json({ error: "Failed to send campaign" });
  }
});

router.post("/campaigns/:id/ai-generate", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

    const { tone = "professional", goal = "book a call", targetIndustry = "tech" } = req.body;

    const prompt = `Write a cold outreach email for a campaign called "${campaign.name}".
Goal: ${goal}
Tone: ${tone}
Target industry: ${targetIndustry}

Return ONLY valid JSON (no markdown): {"subject":"...","body":"..."}
The body should be 3-4 short paragraphs, under 200 words. Be specific, not generic. Include a clear CTA.`;

    const raw = await generateText(prompt, "You are an expert cold email copywriter. Return only valid JSON.");
    let result = { subject: "", body: "" };
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { subject: `Quick question about ${targetIndustry}`, body: raw };
    }

    // Save to campaign
    await db.update(campaignsTable).set({ subject: result.subject, body: result.body }).where(eq(campaignsTable.id, id));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "ai generate failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

// ─── Email Accounts ───────────────────────────────────────────────────────────

router.get("/email-accounts", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(emailAccountsTable).orderBy(desc(emailAccountsTable.createdAt));
    res.json(rows.map(serializeAccount));
  } catch (err) {
    req.log.error({ err }, "list accounts failed");
    res.status(500).json({ error: "Failed to list accounts" });
  }
});

router.post("/email-accounts", async (req, res): Promise<void> => {
  try {
    const { email, provider, smtpHost, smtpPort, smtpUser, smtpPassword } = req.body;
    if (!email || !provider) { res.status(400).json({ error: "email and provider required" }); return; }

    // Verify connection before saving
    if (smtpHost && smtpUser && smtpPassword) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort ?? 587,
          secure: (smtpPort ?? 587) === 465,
          auth: { user: smtpUser, pass: smtpPassword },
        });
        await transporter.verify();
      } catch (verifyErr) {
        req.log.warn({ verifyErr }, "SMTP verify failed");
        res.status(400).json({ error: "SMTP connection failed — check your credentials" });
        return;
      }
    }

    const [account] = await db.insert(emailAccountsTable).values({
      email,
      provider,
      smtpHost: smtpHost ?? null,
      smtpPort: smtpPort ? Number(smtpPort) : null,
      smtpUser: smtpUser ?? null,
      smtpPasswordEncrypted: smtpPassword ?? null, // In production use real encryption
    }).returning();

    res.status(201).json(serializeAccount(account));
  } catch (err) {
    req.log.error({ err }, "connect account failed");
    res.status(500).json({ error: "Failed to connect account" });
  }
});

router.delete("/email-accounts/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(emailAccountsTable).where(eq(emailAccountsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "disconnect account failed");
    res.status(500).json({ error: "Failed to disconnect account" });
  }
});

export default router;
