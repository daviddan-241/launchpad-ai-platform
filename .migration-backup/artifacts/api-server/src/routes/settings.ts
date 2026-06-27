import { Router, type IRouter } from "express";
import { db, emailAccountsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import nodemailer from "nodemailer";
import { getAIProvider } from "../lib/ai";

const router: IRouter = Router();

// Auto-detect SMTP config from email address
function smtpConfig(email: string): { host: string; port: number } {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("gmail") || domain.includes("googlemail")) return { host: "smtp.gmail.com", port: 587 };
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live") || domain.includes("msn")) return { host: "smtp.office365.com", port: 587 };
  if (domain.includes("yahoo")) return { host: "smtp.mail.yahoo.com", port: 587 };
  if (domain.includes("icloud") || domain.includes("me.com") || domain.includes("mac.com")) return { host: "smtp.mail.me.com", port: 587 };
  if (domain.includes("zoho")) return { host: "smtp.zoho.com", port: 587 };
  if (domain.includes("proton") || domain.includes("pm.me")) return { host: "smtp.protonmail.ch", port: 587 };
  // Generic fallback
  return { host: `smtp.${domain}`, port: 587 };
}

function providerName(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("gmail")) return "Gmail";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) return "Outlook";
  if (domain.includes("yahoo")) return "Yahoo";
  if (domain.includes("icloud") || domain.includes("me.com")) return "iCloud";
  if (domain.includes("zoho")) return "Zoho";
  if (domain.includes("proton")) return "ProtonMail";
  return "Custom";
}

router.get("/settings", async (req, res): Promise<void> => {
  try {
    const accounts = await db.select().from(emailAccountsTable).orderBy(desc(emailAccountsTable.createdAt));
    const ai = getAIProvider();
    const primary = accounts[0] ?? null;
    res.json({
      emailConnected: accounts.length > 0,
      email: primary?.email ?? null,
      provider: primary?.provider ?? null,
      emailAccounts: accounts.map(a => ({ id: a.id, email: a.email, provider: a.provider, createdAt: a.createdAt.toISOString() })),
      ai,
      ollamaSetup: {
        recommended: "qwen2.5:0.5b",
        size: "397 MB",
        commands: [
          "brew install ollama",
          "ollama pull qwen2.5:0.5b",
          "ollama serve",
        ],
      },
    });
  } catch (err) {
    req.log.error({ err }, "get settings failed");
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// Quick setup: just email + password
router.post("/settings/email", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const smtp = smtpConfig(email);
    const provider = providerName(email);

    // Try to verify SMTP connection
    let verified = false;
    let verifyError: string | null = null;
    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: false,
        auth: { user: email, pass: password },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
      });
      await transporter.verify();
      verified = true;
    } catch (err) {
      verifyError = err instanceof Error ? err.message : String(err);
      req.log.warn({ verifyError }, "SMTP verify failed");
    }

    if (!verified) {
      res.status(400).json({
        error: "Could not connect to email server",
        detail: verifyError,
        hint: provider === "Gmail"
          ? "Use a Gmail App Password (not your regular password). Go to myaccount.google.com → Security → 2-Step Verification → App passwords."
          : `Make sure you have SMTP access enabled for ${provider}.`,
      });
      return;
    }

    // Save (replace existing for same email, or insert new)
    const existing = await db.select().from(emailAccountsTable).where(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.email.eq ? t.email.eq(email) : undefined
    );

    const values = {
      email,
      provider,
      smtpHost: smtp.host,
      smtpPort: smtp.port,
      smtpUser: email,
      smtpPasswordEncrypted: password,
    };

    let saved;
    try {
      // Try to find existing by scanning
      const rows = await db.select().from(emailAccountsTable);
      const match = rows.find(r => r.email === email);
      if (match) {
        const { eq } = await import("drizzle-orm");
        const [updated] = await db.update(emailAccountsTable).set(values).where(eq(emailAccountsTable.id, match.id)).returning();
        saved = updated;
      } else {
        const [inserted] = await db.insert(emailAccountsTable).values(values).returning();
        saved = inserted;
      }
    } catch {
      const [inserted] = await db.insert(emailAccountsTable).values(values).returning();
      saved = inserted;
    }

    res.json({
      success: true,
      message: `✅ ${provider} connected! You can now send campaigns.`,
      account: { id: saved.id, email: saved.email, provider: saved.provider },
    });
  } catch (err) {
    req.log.error({ err }, "save email settings failed");
    res.status(500).json({ error: "Failed to save email settings" });
  }
});

router.delete("/settings/email/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { eq } = await import("drizzle-orm");
    await db.delete(emailAccountsTable).where(eq(emailAccountsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "disconnect email failed");
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

export default router;
