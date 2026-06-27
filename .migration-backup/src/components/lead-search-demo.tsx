"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/demo-data";

export function LeadSearchDemo({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState("fintech nigeria growth");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    const tokens = q.split(/\s+/).filter(Boolean);

    return leads
      .map((lead) => {
        const content = [
          lead.name,
          lead.title,
          lead.company,
          lead.region,
          lead.industry,
          ...lead.tags,
          ...lead.painPoints,
          lead.recentSignal,
        ]
          .join(" ")
          .toLowerCase();

        const matches = tokens.reduce((acc, token) => acc + (content.includes(token) ? 1 : 0), 0);
        return { lead, score: matches * 25 + lead.fitScore + lead.intentScore };
      })
      .filter((item) => item.score > item.lead.fitScore + item.lead.intentScore)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.lead);
  }, [leads, query]);

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">AI lead discovery</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Ask in plain English and rank the best-fit leads</h3>
        </div>
        <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs text-fuchsia-100">
          Real frontend logic on demo data
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: revops saas uk crm"
          className="w-full rounded-2xl border border-white/10 bg-[#120c1e] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
        />
        <button
          onClick={() => setQuery(query.trim())}
          className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200"
        >
          Rank leads
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {filtered.length ? (
          filtered.slice(0, 4).map((lead) => (
            <div key={lead.id} className="rounded-3xl border border-white/8 bg-[#071121] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{lead.name}</p>
                  <p className="text-sm text-slate-400">{lead.title} · {lead.company} · {lead.region}</p>
                  <p className="mt-2 text-sm text-slate-300">Signal: {lead.recentSignal}</p>
                </div>
                <div className="flex gap-3 text-xs text-slate-300">
                  <div className="rounded-2xl border border-white/10 px-3 py-2">Fit {lead.fitScore}</div>
                  <div className="rounded-2xl border border-white/10 px-3 py-2">Intent {lead.intentScore}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#071121] p-6 text-sm text-slate-400">
            No matches. Try keywords like fintech, revops, founder, Nigeria, or CRM.
          </div>
        )}
      </div>
    </section>
  );
}
