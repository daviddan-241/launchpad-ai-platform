"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DealOption = { id: string; clientName: string; company: string; clientEmail: string };

export function DeliveryProjectForm({ deals }: { deals: DealOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    dealId: deals[0]?.id ?? "",
    title: "Website MVP Delivery",
    clientName: deals[0]?.clientName ?? "",
    clientEmail: deals[0]?.clientEmail ?? "",
    scope: "Landing page, contact flow, and follow-up automation handoff",
    acceptanceRequired: true,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleDealChange(dealId: string) {
    const deal = deals.find((item) => item.id === dealId);
    setForm((s) => ({
      ...s,
      dealId,
      clientName: deal?.clientName ?? s.clientName,
      clientEmail: deal?.clientEmail ?? s.clientEmail,
      title: deal ? `${deal.company} Delivery` : s.title,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/delivery-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    setLoading(false);
    setMessage(payload.error || payload.message || "Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Start delivery</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Create a real project handoff</h2>
      <div className="mt-4 grid gap-3">
        <select value={form.dealId} onChange={(e)=>handleDealChange(e.target.value)} className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40">
          <option value="">No linked deal</option>
          {deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.clientName} · {deal.company}</option>)}
        </select>
        <input value={form.title} onChange={(e)=>setForm((s)=>({...s, title:e.target.value}))} placeholder="Project title" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <div className="grid gap-3 md:grid-cols-2">
          <input value={form.clientName} onChange={(e)=>setForm((s)=>({...s, clientName:e.target.value}))} placeholder="Client name" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
          <input value={form.clientEmail} onChange={(e)=>setForm((s)=>({...s, clientEmail:e.target.value}))} type="email" placeholder="Client email" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        </div>
        <textarea value={form.scope} onChange={(e)=>setForm((s)=>({...s, scope:e.target.value}))} className="min-h-[120px] rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input type="checkbox" checked={form.acceptanceRequired} onChange={(e)=>setForm((s)=>({...s, acceptanceRequired:e.target.checked}))} />
          Require client acceptance before final delivery.
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={loading} className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70">{loading ? "Saving..." : "Create delivery project"}</button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
