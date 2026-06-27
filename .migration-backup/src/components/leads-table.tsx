"use client";

import { useState } from "react";
import type { Lead } from "@/lib/demo-data";

type Enrichment = {
  companyOverview: string;
  recentSignals: string[];
  techStack: string[];
  decisionMakerPattern: string;
  outreachAngle: string;
  updatedPainPoints: string[];
  buyingSignal: string;
  enrichedAt: string;
};

type EnrichedLead = Lead & { enrichment?: Enrichment };

function ScorePip({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "text-amber-300" : value >= 60 ? "text-fuchsia-300" : "text-slate-400";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-base font-bold leading-none ${color}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

function IntelPanel({ lead, onClose }: { lead: EnrichedLead; onClose: () => void }) {
  const [enrichment, setEnrichment] = useState<Enrichment | null>(lead.enrichment ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function enrich() {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`/api/leads/${lead.id}/enrich`, { method: "POST" });
      const data = (await resp.json()) as { enrichment?: Enrichment; error?: string };
      if (data.error) throw new Error(data.error);
      if (data.enrichment) setEnrichment(data.enrichment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrichment failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-fuchsia-400/20 bg-[#0f0720] px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-300">Lead intelligence</p>
          <p className="mt-0.5 text-sm font-medium text-white">{lead.name} · {lead.company}</p>
        </div>
        <div className="flex items-center gap-2">
          {!enrichment || loading ? (
            <button
              onClick={enrich}
              disabled={loading}
              className="rounded-2xl bg-fuchsia-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-fuchsia-400 disabled:opacity-60"
            >
              {loading ? "Researching..." : "Run AI Research"}
            </button>
          ) : (
            <button
              onClick={enrich}
              disabled={loading}
              className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

      {loading && !enrichment && (
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-fuchsia-400" style={{ animationDelay: "0ms" }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-fuchsia-400" style={{ animationDelay: "150ms" }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-fuchsia-400" style={{ animationDelay: "300ms" }} />
          <span className="text-xs text-slate-400">AI is researching {lead.company}...</span>
        </div>
      )}

      {enrichment && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-white/8 bg-[#140a20] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-400">Company overview</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{enrichment.companyOverview}</p>
          </div>

          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Best outreach angle</p>
            <p className="mt-2 text-sm leading-6 text-white">{enrichment.outreachAngle}</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#140a20] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-400">Buying signal right now</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{enrichment.buyingSignal}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-[#140a20] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-400">Recent signals</p>
              <ul className="mt-2 space-y-1.5">
                {enrichment.recentSignals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fuchsia-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#140a20] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-400">Pain points</p>
              <ul className="mt-2 space-y-1.5">
                {enrichment.updatedPainPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#140a20] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-400">Tech stack (likely)</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {enrichment.techStack.map((t) => (
                  <span key={t} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-300">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#140a20] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-400">Decision making</p>
              <p className="mt-2 text-xs leading-5 text-slate-300">{enrichment.decisionMakerPattern}</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-600">
            Enriched {new Date(enrichment.enrichedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: EnrichedLead }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-white">{lead.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{lead.title} · {lead.company}</p>
            <p className="mt-1 text-[10px] text-fuchsia-300">{lead.email}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ScorePip value={lead.fitScore} label="Fit" />
            <ScorePip value={lead.intentScore} label="Intent" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">{lead.industry}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">{lead.companySize}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">{lead.region}</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] ${
            lead.stage === "Contacted" ? "border border-amber-400/20 bg-amber-400/10 text-amber-200"
            : lead.stage === "Meeting" ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
            : lead.stage === "Qualified" ? "border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200"
            : "border border-white/10 bg-white/5 text-slate-400"
          }`}>
            {lead.stage}
          </span>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-400">{lead.recentSignal}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Next: {lead.nextStep}</p>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-medium transition ${
              open
                ? "border border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200"
                : lead.enrichment
                ? "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
                : "border border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200 hover:bg-fuchsia-400/20"
            }`}
          >
            {open ? "Hide intel" : lead.enrichment ? "View intel" : "Enrich lead"}
          </button>
        </div>
      </div>

      {open && <IntelPanel lead={lead} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function LeadsTable({ leads }: { leads: EnrichedLead[] }) {
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? leads.filter((l) =>
        [l.name, l.company, l.title, l.industry, l.region, l.stage, ...l.tags]
          .join(" ")
          .toLowerCase()
          .includes(filter.toLowerCase()),
      )
    : leads;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter leads by name, company, industry..."
          className="flex-1 rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400 hover:bg-white/5"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
          No leads match that filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      <p className="text-right text-[10px] text-slate-600">
        {filtered.length} of {leads.length} leads
      </p>
    </div>
  );
}
