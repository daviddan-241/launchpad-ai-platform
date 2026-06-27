"use client";

import { useState } from "react";

type AgentResult = {
  prompt: string;
  leads: Array<{ id: string; name: string; company: string; title: string; fitScore: number; intentScore: number }>;
  plan: { audience: string; objective: string; steps: string[]; guardrails: string[] };
};

export function AgentConsole() {
  const [prompt, setPrompt] = useState("Find revops leaders in SaaS and build a 5-touch sequence to book meetings");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAgent() {
    setLoading(true);
    const response = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const payload = (await response.json()) as AgentResult;
    setResult(payload);
    setLoading(false);
  }

  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Command engine</p>
      <h2 className="mt-2 text-xl font-semibold text-white">One prompt → leads + campaign plan</h2>
      <div className="mt-4 grid gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[110px] rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
        />
        <button
          type="button"
          onClick={runAgent}
          disabled={loading}
          className="w-fit rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70"
        >
          {loading ? "Running..." : "Run command"}
        </button>
      </div>

      {result ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-3xl border border-white/8 bg-[#161022] p-4">
            <p className="text-sm text-slate-400">Audience</p>
            <p className="mt-1 text-white">{result.plan.audience}</p>
            <p className="mt-4 text-sm text-slate-400">Objective</p>
            <p className="mt-1 text-white">{result.plan.objective}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {result.leads.map((lead) => (
              <div key={lead.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <p className="font-medium text-white">{lead.name}</p>
                <p className="mt-1 text-sm text-slate-400">{lead.title} · {lead.company}</p>
                <p className="mt-3 text-sm text-slate-300">Fit {lead.fitScore} · Intent {lead.intentScore}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {result.plan.steps.map((step) => (
              <div key={step} className="rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm text-slate-200">
                {step}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
