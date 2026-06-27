"use client";

import { useState } from "react";

type Account = { id: string; provider: string; email: string };

const NICHES = [
  "e-commerce businesses",
  "restaurants and food businesses",
  "real estate agencies",
  "law firms",
  "dental clinics",
  "gyms and fitness studios",
  "beauty salons and spas",
  "construction companies",
  "marketing agencies",
  "SaaS startups",
  "local service businesses",
  "manufacturing companies",
];

const OFFERS = [
  "website design and development",
  "SEO and Google ranking",
  "social media management",
  "logo and brand identity",
  "Facebook/Instagram ads",
  "Google Ads management",
  "email marketing setup",
  "business automation",
  "content writing and blogging",
  "video editing",
  "app development",
  "CRM setup and consulting",
];

export function AutonomousLaunchForm({ accounts }: { accounts: Account[] }) {
  const [form, setForm] = useState({
    niche: "",
    offer: "",
    price: "",
    currency: "USD",
    targetCount: "20",
    region: "",
    emailAccountId: accounts[0]?.id ?? "",
    customNiche: "",
    customOffer: "",
  });
  const [status, setStatus] = useState<"idle" | "launching" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<{ id: string; name: string } | null>(null);

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const finalNiche = form.niche === "__custom__" ? form.customNiche : form.niche;
  const finalOffer = form.offer === "__custom__" ? form.customOffer : form.offer;

  async function launch() {
    if (!finalNiche || !finalOffer || !form.price || !form.emailAccountId) {
      setError("Fill in niche, offer, price, and pick an email account.");
      return;
    }
    setError("");
    setStatus("launching");
    try {
      const res = await fetch("/api/autonomous/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: finalNiche,
          offer: finalOffer,
          price: Number(form.price),
          currency: form.currency,
          targetCount: Number(form.targetCount),
          region: form.region || undefined,
          emailAccountId: form.emailAccountId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; campaign?: { id: string; name: string }; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Launch failed");
      setCampaign(data.campaign ?? null);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed");
      setStatus("error");
    }
  }

  if (status === "done" && campaign) {
    return (
      <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/8 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Campaign launched</p>
        <h3 className="mt-2 text-xl font-semibold text-white">{campaign.name}</h3>
        <p className="mt-3 text-sm text-slate-300">
          LeadForge is now running autonomously. It will generate leads, send outreach, follow up, handle replies, and send payment links — all automatically. Check the <strong>Activity</strong> page to watch it work in real time.
        </p>
        <button
          onClick={() => { setStatus("idle"); setCampaign(null); }}
          className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
        >
          Launch another
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-fuchsia-300/20 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Auto-pilot mode</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Launch autonomous campaign</h3>
      <p className="mt-2 text-sm text-slate-400">
        Set the target niche, your offer, and price. LeadForge will find businesses, email them, reply to interested leads, and send payment links — all automatically with zero input from you.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-xs text-slate-400">Target niche</label>
          <select value={form.niche} onChange={(e) => set("niche", e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40">
            <option value="">Pick a niche…</option>
            {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="__custom__">Custom niche…</option>
          </select>
          {form.niche === "__custom__" && (
            <input value={form.customNiche} onChange={(e) => set("customNiche", e.target.value)} placeholder="Describe the type of business" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
          )}
        </div>

        <div>
          <label className="text-xs text-slate-400">Your offer</label>
          <select value={form.offer} onChange={(e) => set("offer", e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40">
            <option value="">Pick your offer…</option>
            {OFFERS.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="__custom__">Custom offer…</option>
          </select>
          {form.offer === "__custom__" && (
            <input value={form.customOffer} onChange={(e) => set("customOffer", e.target.value)} placeholder="What are you selling?" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Price</label>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1500" className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Currency</label>
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40">
              {["USD","GBP","EUR","NGN","GHS","KES","ZAR","CAD","AUD"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">How many leads</label>
            <select value={form.targetCount} onChange={(e) => set("targetCount", e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40">
              {["5","10","20","30","50","75","100"].map((n) => <option key={n} value={n}>{n} leads</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Region (optional)</label>
            <input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Lagos, UK, USA" className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">Send from email</label>
          {accounts.length === 0 ? (
            <p className="mt-2 text-sm text-amber-200">No email connected. Go to Settings → Email to add one first.</p>
          ) : (
            <select value={form.emailAccountId} onChange={(e) => set("emailAccountId", e.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.email} ({a.provider})</option>)}
            </select>
          )}
        </div>

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

        <button
          onClick={launch}
          disabled={status === "launching" || accounts.length === 0}
          className="w-full rounded-2xl bg-fuchsia-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "launching" ? "Launching…" : `Launch autonomous campaign →`}
        </button>

        <p className="text-center text-xs text-slate-500">
          Zero approvals needed. LeadForge handles everything end-to-end.
        </p>
      </div>
    </div>
  );
}
