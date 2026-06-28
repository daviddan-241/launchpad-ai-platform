import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";
import nodemailer from "nodemailer";

const router = Router();
router.use(requireAuth);

router.post("/send", async (req: AuthRequest, res) => {
  try {
    const { to, subject, body, fromName, fromEmail, leadId } = req.body as {
      to: string; subject: string; body: string; fromName: string; fromEmail: string; leadId?: number;
    };

    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);

    if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
      res.status(400).json({ error: "SMTP not configured. Please configure your email settings first." });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: settings.smtpPassword },
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ""),
    });

    await db.insert(activityTable).values({
      userId: req.userId!,
      type: "email",
      description: `Email sent to ${to}: "${subject}"`,
    });

    res.json({ success: true, message: `Email sent to ${to}` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: `Failed to send email: ${err instanceof Error ? err.message : "Unknown error"}` });
  }
});

export default router;
