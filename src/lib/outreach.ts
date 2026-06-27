import { logActivityEvent } from "@/lib/activity";
import { sendEmailWithAccount } from "@/lib/email";
import { processInactivePaymentDrafts } from "@/lib/payments";
import { createId, readStore, updateStore, type OutreachJob } from "@/lib/store";

function htmlFromText(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
}

export async function queueOutreachJob(input: {
  userId: string;
  accountId: string;
  provider: "google" | "microsoft" | "smtp";
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
  sendAt: string;
}) {
  const job: OutreachJob = {
    id: createId("JOB"),
    userId: input.userId,
    accountId: input.accountId,
    provider: input.provider,
    fromEmail: input.fromEmail,
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: htmlFromText(input.body),
    sendAt: input.sendAt,
    createdAt: new Date().toISOString(),
    status: "queued",
  };

  await updateStore((store) => {
    store.outreachJobs.unshift(job);
    return store;
  });

  await logActivityEvent({
    userId: input.userId,
    type: "outreach",
    title: `Queued outreach to ${input.to}`,
    detail: input.subject,
    status: "pending",
  });

  return job;
}

export async function processDueOutreachJobs() {
  const store = await readStore();
  const now = Date.now();
  const dueJobs = store.outreachJobs.filter((job) => job.status === "queued" && new Date(job.sendAt).getTime() <= now);

  for (const job of dueJobs) {
    await updateStore((draft) => {
      const target = draft.outreachJobs.find((item) => item.id === job.id);
      if (target && target.status === "queued") {
        target.status = "sending";
      }
      return draft;
    });

    try {
      await sendEmailWithAccount({
        accountId: job.accountId,
        to: job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
      });

      await updateStore((draft) => {
        const target = draft.outreachJobs.find((item) => item.id === job.id);
        if (target) {
          target.status = "sent";
          target.sentAt = new Date().toISOString();
          target.error = undefined;
        }
        return draft;
      });

      await logActivityEvent({
        userId: job.userId,
        type: "outreach",
        title: `Sent outreach to ${job.to}`,
        detail: job.subject,
        status: "done",
      });
    } catch (error) {
      await updateStore((draft) => {
        const target = draft.outreachJobs.find((item) => item.id === job.id);
        if (target) {
          target.status = "failed";
          target.error = error instanceof Error ? error.message : "Could not send email.";
        }
        return draft;
      });

      await logActivityEvent({
        userId: job.userId,
        type: "outreach",
        title: `Outreach failed for ${job.to}`,
        detail: error instanceof Error ? error.message : "Could not send email.",
        status: "failed",
      });
    }
  }

  return dueJobs.length;
}

export function bootstrapOutreachWorker() {
  if (typeof globalThis === "undefined") return;
  const runtime = globalThis as typeof globalThis & { __leadforgeWorkersStarted?: boolean };
  if (runtime.__leadforgeWorkersStarted) return;
  runtime.__leadforgeWorkersStarted = true;

  const timer = setInterval(() => {
    processDueOutreachJobs().catch(() => undefined);
    processInactivePaymentDrafts().catch(() => undefined);
  }, 60_000);
  timer.unref?.();
}
