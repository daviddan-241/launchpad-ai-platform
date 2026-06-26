import { LeadSearchDemo } from "@/components/lead-search-demo";
import { AgentConsole } from "@/components/agent-console";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const store = await readStore();
  const runningCampaigns = store.campaigns.filter((campaign) => campaign.status === "Running").length;
  const meetings = store.campaigns.reduce((sum, campaign) => sum + campaign.meetings, 0);
  const averageReplyRate = store.campaigns.length
    ? (store.campaigns.reduce((sum, campaign) => sum + campaign.replyRate, 0) / store.campaigns.length).toFixed(1)
    : "0.0";
  const pendingPayments = store.paymentRequests.filter((request) => request.status === "awaiting_approval" || request.status === "link_ready");
  const revenuePotential = pendingPayments.reduce((sum, request) => sum + request.amount, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] border border-white/10 bg-white/5 p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Overview</p>
            <h1 className="mt-2 text-3xl font-semibold text-white lg:text-5xl">Revenue, delivery, and autonomous follow-through.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Track live outreach work, chat actions, follow-ups, and payment pipeline in one mobile-first workspace.
            </p>
          </div>
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-100/80">Revenue potential</p>
            <p className="mt-2 text-4xl font-bold text-white">${revenuePotential.toFixed(0)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Active leads", value: `${store.leads.length}`, detail: "saved in local DB" },
            { label: "Running campaigns", value: `${runningCampaigns}`, detail: `${store.campaigns.length} total campaigns` },
            { label: "Reply rate", value: `${averageReplyRate}%`, detail: "across campaigns" },
            { label: "Meetings booked", value: `${meetings}`, detail: "tracked from campaigns" },
            { label: "Payment drafts", value: `${pendingPayments.length}`, detail: "awaiting approval or ready" },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-[#161022] p-5">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <LeadSearchDemo leads={store.leads} />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Priority tasks</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Today’s next best actions</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{store.tasks.length} tasks</span>
          </div>
          <div className="mt-4 space-y-3">
            {store.tasks.map((task) => (
              <div key={task.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-400">Owner: {task.owner} · Due {task.due}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{task.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Payment pipeline</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Owner-gated revenue requests</h2>
          <div className="mt-4 space-y-4">
            {pendingPayments.length ? pendingPayments.slice(0, 4).map((request) => (
              <div key={request.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{request.clientName}</p>
                    <p className="mt-1 text-sm text-slate-400">{request.clientEmail}</p>
                    <p className="mt-2 text-sm text-slate-300">{request.currency} {request.amount} · {request.paymentType}</p>
                  </div>
                  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs text-fuchsia-100">{request.status}</span>
                </div>
              </div>
            )) : <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-400">No active payment drafts yet.</div>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Inbox intelligence</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Recent high-signal replies</h2>
          <div className="mt-4 space-y-3">
            {store.inbox.map((message) => (
              <div key={message.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{message.from} · {message.company}</p>
                    <p className="mt-1 text-sm text-slate-400">{message.subject}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{message.sentiment}</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">{message.preview}</p>
              </div>
            ))}
          </div>
        </div>

        <AgentConsole />
      </section>
    </div>
  );
}
