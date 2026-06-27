"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const defaultPrompt = "Book meetings with African fintech growth leaders";

export function CreateCampaignForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    audience: "",
    objective: "",
    channels: "Email, LinkedIn",
  });
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [plan, setPlan] = useState<string[]>([]);
  const [guardrails, setGuardrails] = useState<string[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [message, setMessage] = useState("");

  const channelMix = useMemo(
    () => form.channels.split(",").map((item) => item.trim()).filter(Boolean),
    [form.channels],
  );

  async function buildPlan() {
    setLoadingPlan(true);
    setMessage("");
    const response = await fetch("/api/campaigns/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const payload = (await response.json()) as {
      plan: { steps: string[]; guardrails: string[]; audience: string; objective: string };
    };

    setPlan(payload.plan.steps);
    setGuardrails(payload.plan.guardrails);
    setForm((current) => ({
      ...current,
      audience: current.audience || payload.plan.audience,
      objective: current.objective || payload.plan.objective,
    }));
    setLoadingPlan(false);
  }

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingCreate(true);
    setMessage("");

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        audience: form.audience,
        objective: form.objective,
        channelMix,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; campaign?: { name: string } };

    if (!response.ok) {
      setMessage(payload.error || "Could not create campaign.");
      setLoadingCreate(false);
      return;
    }

    setMessage(`Campaign created: ${payload.campaign?.name ?? form.name}`);
    setForm({ name: "", audience: "", objective: "", channels: "Email, LinkedIn" });
    setLoadingCreate(false);
    router.refresh();
  }

  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Launch campaign</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Free AI sequence builder</h2>

      <div className="mt-4 grid gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[108px] rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          placeholder="Describe the campaign you want"
        />
        <button
          type="button"
          onClick={buildPlan}
          disabled={loadingPlan}
          className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/5 disabled:opacity-70"
        >
          {loadingPlan ? "Generating plan..." : "Generate plan"}
        </button>
      </div>

      {plan.length ? (
        <div className="mt-5 space-y-3">
          {plan.map((step) => (
            <div key={step} className="rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm text-slate-200">
              {step}
            </div>
          ))}
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50">
            {guardrails.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={createCampaign} className="mt-5 grid gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
          placeholder="Campaign name"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <input
          value={form.audience}
          onChange={(e) => setForm((current) => ({ ...current, audience: e.target.value }))}
          placeholder="Audience"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <input
          value={form.objective}
          onChange={(e) => setForm((current) => ({ ...current, objective: e.target.value }))}
          placeholder="Objective"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <input
          value={form.channels}
          onChange={(e) => setForm((current) => ({ ...current, channels: e.target.value }))}
          placeholder="Channels, separated by commas"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loadingCreate}
            className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70"
          >
            {loadingCreate ? "Creating..." : "Create campaign"}
          </button>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
      </form>
    </div>
  );
}
