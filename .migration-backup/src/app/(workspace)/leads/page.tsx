import { CreateLeadForm } from "@/components/create-lead-form";
import { LeadsCsvPanel } from "@/components/leads-csv-panel";
import { LeadsTable } from "@/components/leads-table";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const store = await readStore();

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Leads</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Lead intelligence</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Tap any lead and run AI research — it pulls company overview, buying signals, tech stack, decision-maker patterns, and your best opening angle in seconds.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-2 text-xs text-slate-300">
            Total: <span className="font-semibold text-white">{store.leads.length}</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-2 text-xs text-slate-300">
            Qualified: <span className="font-semibold text-fuchsia-200">{store.leads.filter((l) => l.stage === "Qualified").length}</span>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
            Avg fit: <span className="font-semibold">{store.leads.length ? Math.round(store.leads.reduce((s, l) => s + l.fitScore, 0) / store.leads.length) : 0}</span>
          </div>
        </div>
      </section>

      <CreateLeadForm />
      <LeadsCsvPanel />

      <LeadsTable leads={store.leads as Parameters<typeof LeadsTable>[0]["leads"]} />
    </div>
  );
}
