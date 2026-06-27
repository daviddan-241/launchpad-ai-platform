import { LeadSearchDemo } from "@/components/lead-search-demo";
import { AgentConsole } from "@/components/agent-console";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const store = await readStore();

  const autoCampaigns = (store.autonomousCampaigns ?? []).filter((c) => c.userId === user.id);
  const myDeals = store.deals.filter((d) => d.userId === user.id);
  const myPayments = store.paymentRequests.filter((p) => p.userId === user.id);

  const totalRevenue = myPayments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingRevenue = myPayments.filter((p) => ["link_ready", "sent", "awaiting_approval"].includes(p.status)).reduce((s, p) => s + p.amount, 0);
  const wonDeals = myDeals.filter((d) => d.stage === "Won").length;
  const activePipeline = myDeals.filter((d) => !["Won", "Lost"].includes(d.stage)).reduce((s, d) => s + d.value, 0);

  const totalEmailed = autoCampaigns.reduce((s, c) => s + (c.totalEmailed || 0), 0);
  const totalPaymentsSent = autoCampaigns.reduce((s, c) => s + (c.steps.filter((st) => st.status === "payment_sent" || st.status === "paid").length), 0);
  const conversionRate = totalEmailed > 0 ? ((totalPaymentsSent / totalEmailed) * 100).toFixed(1) : "0.0";

  const runningCampaigns = store.campaigns.filter((c) => c.status === "Running").length + autoCampaigns.filter((c) => c.status === "running").length;
  const pendingPayments = myPayments.filter((p) => p.status === "awaiting_approval" || p.status === "link_ready");

  const recentActivity = store.activityEvents
    .filter((e) => e.userId === user.id)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] border border-white/10 bg-white/5 p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Revenue overview</p>
            <h1 className="mt-2 text-3xl font-semibold text-white lg:text-4xl">Your money machine</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Live view of everything LeadForge is doing for you — leads found, emails sent, deals moving, and money collected.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Collected</p>
              <p className="mt-1 text-3xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Pending</p>
              <p className="mt-1 text-3xl font-bold text-white">${pendingRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Total leads", value: `${store.leads.length}`, sub: "in database" },
            { label: "Active campaigns", value: `${runningCampaigns}`, sub: "running now" },
            { label: "Emails sent", value: `${totalEmailed}`, sub: "by autopilot" },
            { label: "Conversion rate", value: `${conversionRate}%`, sub: "email → payment" },
            { label: "Deals won", value: `${wonDeals}`, sub: `of ${myDeals.length} total` },
            { label: "Active pipeline", value: `$${activePipeline.toLocaleString()}`, sub: "deals in progress" },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-[#161022] p-4">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {autoCampaigns.length > 0 && (
        <section className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Autopilot status</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Running autonomous campaigns</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {autoCampaigns.filter((c) => c.status === "running").slice(0, 6).map((c) => {
              const pct = c.targetCount > 0 ? Math.round((c.totalEmailed / c.targetCount) * 100) : 0;
              return (
                <div key={c.id} className="rounded-[24px] border border-white/10 bg-[#161022] p-4">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{c.offer}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{c.totalEmailed} / {c.targetCount} emailed</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-fuchsia-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3 flex gap-2 text-xs">
                    <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 text-blue-200">{c.totalEmailed} sent</span>
                    <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-0.5 text-fuchsia-200">{c.steps.filter((s) => s.status === "payment_sent" || s.status === "paid").length} paying</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <LeadSearchDemo leads={store.leads} />

        <section className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Live activity feed</p>
          <h2 className="mt-2 text-xl font-semibold text-white">What's happening right now</h2>
          <div className="mt-4 space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${event.status === "done" ? "bg-emerald-400" : event.status === "failed" ? "bg-rose-400" : "bg-amber-400"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{event.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">{event.detail}</p>
                  <p className="mt-1 text-xs text-slate-600">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-6 text-center">
                <p className="text-sm text-slate-500">No activity yet. Launch an autonomous campaign to start.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Payment pipeline</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Pending and sent payment links</h2>
          <div className="mt-4 space-y-3">
            {pendingPayments.length ? pendingPayments.slice(0, 6).map((p) => (
              <div key={p.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{p.clientName}</p>
                    <p className="text-xs text-slate-400">{p.clientEmail}</p>
                    <p className="mt-1 text-sm font-semibold text-fuchsia-200">{p.currency} {p.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{p.description}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">{p.status.replace(/_/g, " ")}</span>
                </div>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-400">No pending payments. Launch an autonomous campaign to generate them automatically.</div>
            )}
          </div>
        </div>

        <AgentConsole />
      </section>
    </div>
  );
}
