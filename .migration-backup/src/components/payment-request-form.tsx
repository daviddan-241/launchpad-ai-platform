"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PaymentRequestForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    description: "Website MVP and outreach setup",
    amount: "120",
    currency: "USD",
    paymentType: "part",
    installmentCount: "2",
    signatureRequired: true,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        description: form.description,
        amount: Number(form.amount),
        currency: form.currency,
        paymentType: form.paymentType,
        installmentCount: Number(form.installmentCount),
        signatureRequired: form.signatureRequired,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    setLoading(false);
    setMessage(payload.error || payload.message || "Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Payment request</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Prepare a real client payment</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input value={form.clientName} onChange={(e)=>setForm((s)=>({...s, clientName:e.target.value}))} placeholder="Client name" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.clientEmail} onChange={(e)=>setForm((s)=>({...s, clientEmail:e.target.value}))} type="email" placeholder="Client email" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.amount} onChange={(e)=>setForm((s)=>({...s, amount:e.target.value}))} type="number" min="1" placeholder="Amount" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.currency} onChange={(e)=>setForm((s)=>({...s, currency:e.target.value.toUpperCase()}))} placeholder="Currency" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <select value={form.paymentType} onChange={(e)=>setForm((s)=>({...s, paymentType:e.target.value}))} className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40">
          <option value="full">Full payment</option>
          <option value="part">Part payment</option>
          <option value="monthly">Monthly payment</option>
        </select>
        <input value={form.installmentCount} onChange={(e)=>setForm((s)=>({...s, installmentCount:e.target.value}))} type="number" min="1" placeholder="Installments" className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
      </div>
      <textarea value={form.description} onChange={(e)=>setForm((s)=>({...s, description:e.target.value}))} className="mt-3 min-h-[110px] w-full rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
      <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
        <input type="checkbox" checked={form.signatureRequired} onChange={(e)=>setForm((s)=>({...s, signatureRequired:e.target.checked}))} />
        Require client signature/acceptance before final delivery
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={loading} className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70">{loading ? "Saving..." : "Create payment draft"}</button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
