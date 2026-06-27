import { ConversationsInbox } from "@/components/conversation-thread";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const user = await requireCurrentUser();
  const store = await readStore();

  const campaigns = (store.autonomousCampaigns ?? [])
    .filter((c) => c.userId === user.id)
    .map((c) => ({
      id: c.id,
      name: c.name,
      offer: c.offer,
      niche: c.niche,
      price: c.price,
      currency: c.currency,
      status: c.status,
      steps: c.steps,
    }));

  const totalThreads = campaigns.reduce((n, c) => n + c.steps.length, 0);
  const activeThreads = campaigns.reduce(
    (n, c) => n + c.steps.filter((s) => ["in_conversation", "offer_made", "payment_requested"].includes(s.conversationState ?? "")).length,
    0,
  );
  const replied = campaigns.reduce(
    (n, c) => n + c.steps.filter((s) => (s.conversationHistory ?? []).some((m) => m.role === "user")).length,
    0,
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Conversations</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">All email threads</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Every thread the AI has opened with a prospect. Read each message, see the conversation state, and step in to reply manually at any point.
        </p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total threads", value: totalThreads },
          { label: "Active conversations", value: activeThreads },
          { label: "Prospects replied", value: replied },
        ].map((s) => (
          <div key={s.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <ConversationsInbox campaigns={campaigns} senderName={user.name} />
    </div>
  );
}
