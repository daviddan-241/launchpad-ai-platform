"use client";

import { useState } from "react";

type Preference = {
  currency: string;
  starterPrice: number;
  businessPrice: number;
  premiumPrice: number;
  paymentInstructions: string;
  waitIfInactive: boolean;
  autoPreparePaymentAfterMinutes: number;
  autoPreparePaymentEnabled: boolean;
};

export function PricingSettingsForm({ preference }: { preference: Preference }) {
  const [form, setForm] = useState({
    currency: preference.currency,
    starterPrice: String(preference.starterPrice),
    businessPrice: String(preference.businessPrice),
    premiumPrice: String(preference.premiumPrice),
    paymentInstructions: preference.paymentInstructions,
    waitIfInactive: preference.waitIfInactive,
    autoPreparePaymentAfterMinutes: String(preference.autoPreparePaymentAfterMinutes),
    autoPreparePaymentEnabled: preference.autoPreparePaymentEnabled,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currency: form.currency,
        starterPrice: Number(form.starterPrice),
        businessPrice: Number(form.businessPrice),
        premiumPrice: Number(form.premiumPrice),
        paymentInstructions: form.paymentInstructions,
        waitIfInactive: form.waitIfInactive,
        autoPreparePaymentAfterMinutes: Number(form.autoPreparePaymentAfterMinutes),
        autoPreparePaymentEnabled: form.autoPreparePaymentEnabled,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    setLoading(false);
    setMessage(payload.error || payload.message || "Saved.");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Pricing + payment preferences</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Set affordable default offers</h2>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Dave can use these values in proposals and outreach. Payment instructions are only shared when you want them shared.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} placeholder="Currency" className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.starterPrice} onChange={(e) => setForm((s) => ({ ...s, starterPrice: e.target.value }))} type="number" min="0" placeholder="Starter price" className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.businessPrice} onChange={(e) => setForm((s) => ({ ...s, businessPrice: e.target.value }))} type="number" min="0" placeholder="Business price" className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.premiumPrice} onChange={(e) => setForm((s) => ({ ...s, premiumPrice: e.target.value }))} type="number" min="0" placeholder="Premium price" className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
      </div>

      <textarea
        value={form.paymentInstructions}
        onChange={(e) => setForm((s) => ({ ...s, paymentInstructions: e.target.value }))}
        className="mt-3 min-h-[120px] w-full rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40"
        placeholder="How should payment be handled when a client agrees?"
      />

      <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
        <input type="checkbox" checked={form.waitIfInactive} onChange={(e) => setForm((s) => ({ ...s, waitIfInactive: e.target.checked }))} />
        If I am inactive, wait for my approval before final payment instructions are shared.
      </label>

      <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
        <input type="checkbox" checked={form.autoPreparePaymentEnabled} onChange={(e) => setForm((s) => ({ ...s, autoPreparePaymentEnabled: e.target.checked }))} />
        Auto-prepare a payment link after inactivity.
      </label>

      <input value={form.autoPreparePaymentAfterMinutes} onChange={(e) => setForm((s) => ({ ...s, autoPreparePaymentAfterMinutes: e.target.value }))} type="number" min="1" placeholder="Minutes of inactivity before payment link prep" className="mt-3 rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={loading} className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70">
          {loading ? "Saving..." : "Save pricing settings"}
        </button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
