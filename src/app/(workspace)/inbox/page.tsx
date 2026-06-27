import { InboxThread } from "@/components/inbox-thread";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await requireCurrentUser();
  const store = await readStore();

  const hasEmailAccount = store.emailAccounts.some((a) => a.userId === user.id);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Inbox</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">AI reply inbox</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Polls your connected Gmail, Outlook, or SMTP account every 5 minutes for inbound prospect replies.
          Each reply is matched to a known lead, routed into the right campaign thread, and given an AI-suggested response you can send with one click.
        </p>
      </section>

      {!hasEmailAccount && (
        <div className="rounded-[28px] border border-amber-400/25 bg-amber-400/8 px-6 py-5">
          <p className="font-semibold text-amber-200">No email account connected</p>
          <p className="mt-1 text-sm text-amber-100/70">
            Go to{" "}
            <a href="/settings" className="underline hover:text-amber-100">
              Settings → Email integrations
            </a>{" "}
            to connect Gmail, Outlook, or SMTP — then come back and click "Poll now" to pull in replies.
          </p>
        </div>
      )}

      <InboxThread messages={store.inbox.slice(0, 100)} />
    </div>
  );
}
