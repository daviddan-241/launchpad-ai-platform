import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";
import nodemailer from "nodemailer";

const router = Router();
router.use(requireAuth);

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function serializeSettings(s: typeof settingsTable.$inferSelect) {
  return {
    id: s.id, userId: s.userId,
    smtpHost: s.smtpHost, smtpPort: s.smtpPort,
    smtpUser: s.smtpUser, smtpSecure: s.smtpSecure,
    hunterApiKey: maskKey(s.hunterApiKey),
    apolloApiKey: maskKey(s.apolloApiKey),
    openaiApiKey: maskKey(s.openaiApiKey),
    googleSearchApiKey: maskKey(s.googleSearchApiKey),
    googleSearchCx: s.googleSearchCx,
    defaultFromName: s.defaultFromName,
    defaultFromEmail: s.defaultFromEmail,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);
    if (!settings) {
      [settings] = await db.insert(settingsTable).values({ userId: req.userId! }).returning();
    }
    res.json(serializeSettings(settings));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/", async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    const fields = ["smtpHost", "smtpPort", "smtpUser", "smtpPassword", "smtpSecure", "hunterApiKey", "apolloApiKey", "openaiApiKey", "googleSearchApiKey", "googleSearchCx", "defaultFromName", "defaultFromEmail"];
    for (const f of fields) {
      if (body[f] !== undefined) {
        // Don't update masked keys
        const val = body[f];
        if (typeof val === "string" && val.includes("****")) continue;
        update[f] = val === "" ? null : val;
      }
    }

    let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);
    if (!settings) {
      [settings] = await db.insert(settingsTable).values({ userId: req.userId!, ...update }).returning();
    } else {
      [settings] = await db.update(settingsTable).set(update).where(eq(settingsTable.userId, req.userId!)).returning();
    }

    res.json(serializeSettings(settings));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/test-email", async (req: AuthRequest, res) => {
  try {
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);
    if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
      res.status(400).json({ error: "SMTP settings not configured" });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: settings.smtpPassword },
    });

    await transporter.verify();
    res.json({ success: true, message: "Email connection verified successfully!" });
  } catch (err) {
    req.log.error(err);
    res.json({ success: false, message: `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}` });
  }
});

export default router;
