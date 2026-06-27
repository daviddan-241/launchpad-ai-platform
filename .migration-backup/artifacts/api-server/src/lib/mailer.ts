import nodemailer from "nodemailer";
import { db, emailAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

interface SendEmailOptions {
  emailAccountId?: number;
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  let account: typeof emailAccountsTable.$inferSelect | undefined;

  if (opts.emailAccountId) {
    [account] = await db.select().from(emailAccountsTable).where(eq(emailAccountsTable.id, opts.emailAccountId));
  } else {
    [account] = await db.select().from(emailAccountsTable).where(eq(emailAccountsTable.isActive, true));
  }

  if (!account) throw new Error("No email account configured. Add one in Settings.");

  const transporter = nodemailer.createTransport({
    host: account.smtpHost ?? undefined,
    port: account.smtpPort ?? 587,
    secure: (account.smtpPort ?? 587) === 465,
    auth: {
      user: account.smtpUser ?? undefined,
      pass: account.smtpPasswordEncrypted ?? undefined,
    },
  });

  await transporter.sendMail({
    from: account.email,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.6">${opts.body.replace(/\n/g, "<br>")}</div>`,
    replyTo: opts.replyTo,
  });

  logger.info({ to: opts.to, subject: opts.subject }, "email sent");
}

export async function getActiveEmailAccount() {
  const [account] = await db.select().from(emailAccountsTable).where(eq(emailAccountsTable.isActive, true));
  return account ?? null;
}
