import { processDueOutreachJobs } from "@/lib/outreach";
import { processInactivePaymentDrafts } from "@/lib/payments";
import { pollInboxForReplies } from "@/lib/imap";
import { runAutonomousCampaigns } from "@/lib/autonomous";

const OUTREACH_INTERVAL_MS = 60_000;
const IMAP_INTERVAL_MS = 5 * 60_000;
const AUTONOMOUS_INTERVAL_MS = 2 * 60_000;

export function bootstrapAllWorkers() {
  if (typeof globalThis === "undefined") return;
  const runtime = globalThis as typeof globalThis & { __leadforgeWorkersStarted?: boolean };
  if (runtime.__leadforgeWorkersStarted) return;
  runtime.__leadforgeWorkersStarted = true;

  const outreachTimer = setInterval(() => {
    processDueOutreachJobs().catch(() => undefined);
    processInactivePaymentDrafts().catch(() => undefined);
  }, OUTREACH_INTERVAL_MS);

  const imapTimer = setInterval(() => {
    pollInboxForReplies().catch(() => undefined);
  }, IMAP_INTERVAL_MS);

  const autonomousTimer = setInterval(() => {
    runAutonomousCampaigns().catch(() => undefined);
  }, AUTONOMOUS_INTERVAL_MS);

  outreachTimer.unref?.();
  imapTimer.unref?.();
  autonomousTimer.unref?.();

  pollInboxForReplies().catch(() => undefined);
}

export async function runAllWorkerTasks() {
  await Promise.allSettled([
    processDueOutreachJobs(),
    processInactivePaymentDrafts(),
    pollInboxForReplies(),
    runAutonomousCampaigns(),
  ]);
}
