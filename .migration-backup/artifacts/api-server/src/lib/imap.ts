import { db, emailAccountsTable, leadsTable, emailRepliesTable, activityTable } from "@workspace/db";
import { eq, like, isNull } from "drizzle-orm";
import { logger } from "./logger";
import { generateText } from "./ai";
import { sendEmail } from "./mailer";
import { sendPushToAll } from "./push";

export async function checkAndRespondToReplies(): Promise<void> {
  // Get active email account with IMAP settings
  const [account] = await db.select().from(emailAccountsTable).where(eq(emailAccountsTable.isActive, true));
  if (!account?.smtpHost) {
    logger.debug("No email account configured — skipping IMAP check");
    return;
  }

  const imapHost = process.env.IMAP_HOST ?? account.smtpHost.replace("smtp.", "imap.");
  const imapPort = Number(process.env.IMAP_PORT ?? 993);
  const imapUser = account.smtpUser;
  const imapPass = account.smtpPasswordEncrypted;

  if (!imapUser || !imapPass) {
    logger.debug("No IMAP credentials — skipping");
    return;
  }

  let ImapFlow: any;
  try {
    const mod = await import("imapflow");
    ImapFlow = mod.ImapFlow;
  } catch {
    logger.warn("imapflow not available");
    return;
  }

  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: imapPort === 993,
    auth: { user: imapUser, pass: imapPass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for unseen messages in the last 24 hours
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const messages = [];

      for await (const msg of client.fetch({ since, seen: false }, { envelope: true, source: true })) {
        messages.push({
          uid: msg.uid,
          from: msg.envelope.from?.[0]?.address ?? "",
          subject: msg.envelope.subject ?? "",
          messageId: msg.envelope.messageId ?? `uid-${msg.uid}`,
          inReplyTo: msg.envelope.inReplyTo ?? "",
        });
      }

      logger.info({ count: messages.length }, "IMAP: fetched unseen messages");

      for (const msg of messages) {
        if (!msg.from) continue;

        // Skip if already processed
        const existing = await db.select().from(emailRepliesTable)
          .where(eq(emailRepliesTable.messageId, msg.messageId));
        if (existing.length > 0) continue;

        // Find matching lead by email
        const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.email, msg.from));

        // Store the reply
        await db.insert(emailRepliesTable).values({
          leadId: lead?.id ?? null,
          messageId: msg.messageId,
          fromEmail: msg.from,
          subject: msg.subject,
          body: "",
          replied: false,
        });

        // Notify user via push
        await sendPushToAll({
          title: `📬 Reply from ${lead?.companyName ?? msg.from}`,
          body: msg.subject || "(no subject)",
          tag: `reply-${msg.messageId}`,
          url: "/leads",
        });

        // Auto-respond if we have a lead
        if (lead?.email) {
          await autoRespondToReply(lead, msg.subject, account.id);
        }

        // Log activity
        await db.insert(activityTable).values({
          type: "email_reply_received",
          description: `Reply received from ${lead?.companyName ?? msg.from}: "${msg.subject}"`,
          entityId: lead ? String(lead.id) : undefined,
          entityType: "lead",
        });
      }

      // Mark all fetched messages as seen
      if (messages.length > 0) {
        await client.messageFlagsAdd({ since }, ["\\Seen"]);
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "IMAP check failed");
  } finally {
    try { await client.logout(); } catch {}
  }
}

async function autoRespondToReply(
  lead: typeof leadsTable.$inferSelect,
  subject: string,
  emailAccountId: number
): Promise<void> {
  try {
    const systemPrompt = `You are a professional sales representative. Write a brief, warm, professional follow-up reply email.
- Keep it short (3-4 sentences max)
- Be friendly and professional
- Don't use placeholder text
- Focus on moving the conversation forward
- Sign off as "Dave" or your first name only`;

    const prompt = `Write a professional reply to ${lead.companyName} (${lead.contactName ?? "the contact"}) who just replied to our outreach email with subject: "${subject}". 
Company: ${lead.companyName}, Industry: ${lead.industry ?? "unknown"}.
Keep it short, professional, and move toward booking a call.`;

    const replyBody = await generateText(prompt, systemPrompt);
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    await sendEmail({
      emailAccountId,
      to: lead.email!,
      subject: replySubject,
      body: replyBody,
    });

    // Mark reply as responded
    await db.update(emailRepliesTable)
      .set({ replied: true, repliedAt: new Date() })
      .where(eq(emailRepliesTable.fromEmail, lead.email!));

    await db.insert(activityTable).values({
      type: "auto_reply_sent",
      description: `Auto-replied to ${lead.companyName} professionally`,
      entityId: String(lead.id),
      entityType: "lead",
    });

    logger.info({ leadId: lead.id, email: lead.email }, "auto-reply sent");
  } catch (err: any) {
    logger.error({ err: err?.message, leadId: lead.id }, "auto-reply failed");
  }
}
