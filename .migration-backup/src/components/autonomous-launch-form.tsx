"use client";

import { useState } from "react";

type Account = { id: string; provider: string; email: string };

const NICHE_PRESETS = [
  { label: "Restaurants & cafes", value: "restaurants and cafes" },
  { label: "Real estate agencies", value: "real estate agencies" },
  { label: "Law firms", value: "law firms" },
  { label: "Dental clinics", value: "dental clinics" },
  { label: "Gyms & fitness studios", value: "gyms and fitness studios" },
  { label: "Beauty salons & spas", value: "beauty salons and spas" },
  { label: "E-commerce stores", value: "e-commerce businesses" },
  { label: "Construction companies", value: "construction companies" },
  { label: "Marketing agencies", value: "marketing agencies" },
  { label: "Local service businesses", value: "local service businesses" },
  { label: "SaaS startups", value: "SaaS startups" },
  { label: "Accounting firms", value: "accounting and bookkeeping firms" },
];

const OFFER_PRESETS = [
  { label: "Website design", value: "website design and development", defaultPrice: 1200 },
  { label: "Local SEO", value: "local SEO and Google ranking", defaultPrice: 800 },
  { label: "Social media management", value: "social media management", defaultPrice: 600 },
  { label: "Facebook & Instagram ads", value: "Facebook and Instagram ads", defaultPrice: 900 },
  { label: "Google Ads", value: "Google Ads management", defaultPrice: 750 },
  { label: "Email marketing", value: "email marketing automation", defaultPrice: 600 },
  { label: "Logo & brand design", value: "logo and brand identity design", defaultPrice: 700 },
  { label: "Online booking system", value: "online booking and scheduling system", defaultPrice: 900 },
  { label: "E-commerce store", value: "e-commerce store setup", defaultPrice: 1500 },
  { label: "Business automation", value: "business automation and CRM setup", defaultPrice: 1000 },
  { label: "App development", value: "mobile app development", defaultPrice: 3000 },
  { label: "Content writing", value: "content writing and blogging", defaultPrice: 500 },
];

export function AutonomousLaunchForm({ accounts }: { accounts: Account[] }) {
  const [niche, setNiche] = useState("");
  const [customNiche, setCustomNiche] = useState("");
  const [offer, setOffer] = useState("");
  const [customOffer, setCustomOffer] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [targetCount, setTargetCount] = useState("20");
  const [region, setRegion] = useState("");
  const [emailAccountId, setEmailAccountId] = useState(accounts[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "launching" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<{ id: string; name: string } | null>(null);

  const finalNiche = niche === "__custom__" ? customNiche : niche;
  const finalOffer = offer === "__custom__" ? customOffer : offer;

  function handleOfferChange(val: string) {
    setOffer(val);
    if (val !== "__custom__") {
      const preset = OFFER_PRESETS.find((o) => o.value === val);
      if (preset && !price) setPrice(String(preset.defaultPrice));
    }
  }

  async function launch() {
    if (!finalNiche || !finalOffer || !price || !emailAccountId) {
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
          niche: finalNiche, offer: finalOffer, price: Number(price),
          currency, targetCount: Number(targetCount), region: region || undefined, emailAccountId,
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
        <div className="flex items-center gap-3 mb-4">
          <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Campaign running</p>
        </div>
        <h3 className="text-xl font-semibold text-white">{campaign.name}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          LeadForge is now working. It will find businesses, reach out like a real person, have natural conversations, answer questions, generate portfolio demos when asked, and only send payment links when the client is ready to pay.
        </p>
        <p className="mt-2 text-sm text-slate-400">Check <strong className="text-white">Activity</strong> to watch it work in real time.</p>
        <button onClick={() => { setStatus("idle"); setCampaign(null); setNiche(""); setOffer(""); setPrice(""); }}
          className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
          Launch another campaign
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-fuchsia-300/20 bg-white/5 p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-2 w-2 rounded-full bg-fuchsia-400" />
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Auto-pilot</p>
      </div>
      <h3 className="text-xl font-semibold text-white">Launch autonomous campaign</h3>
      <p className="mt-2 text-sm text-slate-400 leading-6">
        LeadForge finds businesses, sends human-like emails, has real conversations, generates portfolio demos on demand, and only sends payment links when the client is ready. Zero approval from you.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-xs text-slate-400">Target niche</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {NICHE_PRESETS.map((n) => (
              <button key={n.value} onClick={() => setNiche(n.value)}
                className={`rounded-full border px-3 py-1 text-xs transition ${niche === n.value ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"}`}>
                {n.label}
              </button>
            ))}
            <button onClick={() => setNiche("__custom__")}
              className={`rounded-full border px-3 py-1 text-xs transition ${niche === "__custom__" ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"}`}>
              Custom…
            </button>
          </div>
          {niche === "__custom__" && (
            <input value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} placeholder="e.g. physiotherapy clinics"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
          )}
        </div>

        <div>
          <label className="text-xs text-slate-400">Your offer</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {OFFER_PRESETS.map((o) => (
              <button key={o.value} onClick={() => handleOfferChange(o.value)}
                className={`rounded-full border px-3 py-1 text-xs transition ${offer === o.value ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"}`}>
                {o.label}
              </button>
            ))}
            <button onClick={() => setOffer("__custom__")}
              className={`rounded-full border px-3 py-1 text-xs transition ${offer === "__custom__" ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"}`}>
              Custom…
            </button>
          </div>
          {offer === "__custom__" && (
            <input value={customOffer} onChange={(e) => setCustomOffer(e.target.value)} placeholder="What are you selling?"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Your price</label>
            <div className="mt-1 flex overflow-hidden rounded-2xl border border-white/10 bg-[#1a0f2e]">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="border-r border-white/10 bg-transparent px-3 py-3 text-sm text-slate-300 focus:outline-none">
                {["USD","GBP","EUR","NGN","GHS","KES","ZAR","CAD","AUD"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1200"
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Lead count</label>
            <select value={targetCount} onChange={(e) => setTargetCount(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40">
              {["5","10","20","30","50","75","100"].map((n) => <option key={n} value={n}>{n} leads</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">Region (optional)</label>
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Lagos, Nigeria — UK — New York"
            className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
        </div>

        <div>
          <label className="text-xs text-slate-400">Send from</label>
          {accounts.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              No email account connected. Go to <strong>Settings → Email Accounts</strong> to add one first.
            </p>
          ) : (
            <select value={emailAccountId} onChange={(e) => setEmailAccountId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.email} ({a.provider})</option>)}
            </select>
          )}
        </div>

        {error && <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

        <button onClick={launch} disabled={status === "launching" || accounts.length === 0}
          className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {status === "launching" ? "Launching…" : "Launch — LeadForge handles the rest →"}
        </button>

        <div className="rounded-2xl border border-white/5 bg-white/3 px-4 py-3 text-xs text-slate-500 space-y-1">
          <p>✓ Finds real businesses in your niche</p>
          <p>✓ Emails them like a human (not a bot)</p>
          <p>✓ Has real back-and-forth conversations</p>
          <p>✓ Generates portfolio demos when asked</p>
          <p>✓ Sends payment link only when they say yes</p>
        </div>
      </div>
    </div>
  );
}
