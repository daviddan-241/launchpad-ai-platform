import { AutonomousLaunchForm } from "@/components/autonomous-launch-form";
import { CreateCampaignForm } from "@/components/create-campaign-form";
import { OutreachComposer } from "@/components/outreach-composer";
import { OutreachJobList } from "@/components/outreach-job-list";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  running: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  paused: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  completed: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  failed: "border-rose-400/20 bg-rose-400/10 text-rose-100",
};

const STEP_COLORS: Record<string, string> = {
  pending: "bg-slate-500",
  emailed: "bg-blue-400",
  followed_up: "bg-violet-400",
  replied: "bg-amber-400",
  interested: "bg-emerald-400",
  payment_sent: "bg-fuchsia-400",
  paid: "bg-emerald-500",
  declined: "bg-rose-400",
  no_reply: "bg-slate-600",
};

export default async function CampaignsPage() {
  const user = await requireCurrentUser();
  const store = await readStore();
  const accounts = store.emailAccounts
    .filter((a) => a.userId === user.id)
    .map(({ id, provider, email }) => ({ id, provider, email }));
  const jobs = store.outreachJobs.filter((j) => j.userId === user.id).slice(0, 12);
  const autoCampaigns = (store.autonomousCampaigns ?? []).filter((c) => c.userId === user.id);

  const totalRevenue = autoCampaigns.reduce((s, c) => s + (c.totalRevenue || 0), 0);
  const totalEmailed = autoCampaigns.reduce((s, c) => s + (c.totalEmailed || 0), 0);
  const totalPaid = autoCampaigns.reduce((s, c) => s + (c.totalPaid || 0), 0);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Campaigns</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Autonomous campaign engine</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Set your niche, offer, and price — LeadForge generates leads, emails them, replies to interested prospects, and sends payment links automatically. No approval needed.
        </p>
      </section>

      {autoCampaigns.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total emailed", value: totalEmailed },
            { label: "Payment links sent", value: totalPaid },
            { label: "Revenue collected", value: `$${totalRevenue.toLocaleString()}` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <AutonomousLaunchForm accounts={accounts} />

          {autoCampaigns.length > 0 && (
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-fuchsia-300">Running campaigns</p>
              <div className="space-y-4">
                {autoCampaigns.map((c) => {
                  const paid = c.steps.filter((s) => s.status === "paid" || s.status === "payment_sent").length;
                  const replied = c.steps.filter((s) => ["replied", "interested", "payment_sent", "paid"].includes(s.status)).length;
                  return (
                    <div key={c.id} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{c.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{c.niche} · {c.offer} · {c.currency} {c.price}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_COLORS[c.status] ?? "border-white/10 text-slate-300"}`}>
                          {c.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                        {[
                          { label: "Target", val: c.targetCount },
                          { label: "Emailed", val: c.totalEmailed },
                          { label: "Replied", val: replied },
                          { label: "Paid", val: paid },
                        ].map((s) => (
                          <div key={s.label} className="rounded-2xl border border-white/8 bg-[#161022] p-2">
                            <p className="text-slate-500">{s.label}</p>
                            <p className="mt-1 font-semibold text-white">{s.val}</p>
                          </div>
                        ))}
                      </div>

                      {c.steps.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs text-slate-500">Lead progress ({c.steps.length} leads)</p>
                          <div className="flex flex-wrap gap-1">
                            {c.steps.map((s) => (
                              <div
                                key={s.leadId}
                                title={`${s.leadName} @ ${s.company} — ${s.status}`}
                                className={`h-3 w-3 rounded-full ${STEP_COLORS[s.status] ?? "bg-slate-600"}`}
                              />
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            {Object.entries(STEP_COLORS).map(([status, color]) => {
                              const count = c.steps.filter((s) => s.status === status).length;
                              if (!count) return null;
                              return (
                                <span key={status} className="flex items-center gap-1">
                                  <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
                                  {status.replace("_", " ")} ({count})
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <CreateCampaignForm />
          <OutreachComposer accounts={accounts} />
        </div>
      </div>

      {store.campaigns.length > 0 && (
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-fuchsia-300">Manual campaigns</p>
          <div className="space-y-4">
            {store.campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{campaign.name}</p>
                    <p className="mt-1 text-sm text-slate-400">Audience: {campaign.audience}</p>
                    <p className="mt-3 text-sm text-slate-300">Objective: {campaign.objective}</p>
                  </div>
                  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs text-fuchsia-100">{campaign.status}</span>
                </div>
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/8 p-3"><p className="text-slate-400">Open</p><p className="mt-1 text-white">{campaign.openRate}%</p></div>
                  <div className="rounded-2xl border border-white/8 p-3"><p className="text-slate-400">Reply</p><p className="mt-1 text-white">{campaign.replyRate}%</p></div>
                  <div className="rounded-2xl border border-white/8 p-3"><p className="text-slate-400">Meetings</p><p className="mt-1 text-white">{campaign.meetings}</p></div>
                  <div className="rounded-2xl border border-white/8 p-3"><p className="text-slate-400">Leads</p><p className="mt-1 text-white">{campaign.leads}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <OutreachJobList jobs={jobs} />
    </div>
  );
}
