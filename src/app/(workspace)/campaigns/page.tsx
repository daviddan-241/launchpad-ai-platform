import { CreateCampaignForm } from "@/components/create-campaign-form";
import { OutreachComposer } from "@/components/outreach-composer";
import { OutreachJobList } from "@/components/outreach-job-list";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await requireCurrentUser();
  const store = await readStore();
  const accounts = store.emailAccounts
    .filter((account) => account.userId === user.id)
    .map(({ id, provider, email }) => ({ id, provider, email }));
  const jobs = store.outreachJobs.filter((job) => job.userId === user.id).slice(0, 12);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Campaigns</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Multichannel campaign engine</h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
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

              <div className="mt-4 flex flex-wrap gap-2">
                {campaign.channelMix.map((channel) => (
                  <span key={channel} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {channel}
                  </span>
                ))}
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

        <div className="space-y-6">
          <CreateCampaignForm />
          <OutreachComposer accounts={accounts} />
        </div>
      </section>

      <OutreachJobList jobs={jobs} />
    </div>
  );
}
