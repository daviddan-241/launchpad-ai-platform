import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { bootstrapOutreachWorker, processDueOutreachJobs, queueOutreachJob } from "@/lib/outreach";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    bootstrapOutreachWorker();
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      accountId?: string;
      to?: string;
      subject?: string;
      body?: string;
      delayMinutes?: number;
    };

    const accountId = body.accountId?.trim();
    const to = body.to?.trim();
    const subject = body.subject?.trim();
    const messageBody = body.body?.trim();
    const delayMinutes = Number(body.delayMinutes ?? 0);

    if (!accountId || !to || !subject || !messageBody) {
      throw new Error("Account, recipient, subject, and message are required.");
    }

    const store = await readStore();
    const account = store.emailAccounts.find((item) => item.id === accountId && item.userId === user.id);
    if (!account) {
      throw new Error("Connected sender account not found.");
    }

    const sendAt = new Date(Date.now() + Math.max(0, delayMinutes) * 60_000).toISOString();
    const job = await queueOutreachJob({
      userId: user.id,
      accountId: account.id,
      provider: account.provider,
      fromEmail: account.email,
      to,
      subject,
      body: messageBody,
      sendAt,
    });

    if (delayMinutes <= 0) {
      await processDueOutreachJobs();
      return NextResponse.json({ ok: true, jobId: job.id, message: `Email sent or processing now to ${to}.` });
    }

    return NextResponse.json({ ok: true, jobId: job.id, message: `Email queued for ${delayMinutes} minute(s) from now.` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not queue outreach." },
      { status: 400 },
    );
  }
}
