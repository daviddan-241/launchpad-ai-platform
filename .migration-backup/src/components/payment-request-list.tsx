"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PaymentRequest = {
  id: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  paymentType: string;
  status: string;
  providerLink?: string;
  description: string;
  createdAt: string;
};

export function PaymentRequestList({ requests }: { requests: PaymentRequest[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(path: string, id: string) {
    setBusyId(id);
    await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setBusyId(null);
    router.refresh();
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Payments</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Client payment pipeline</h2>
      <div className="mt-4 space-y-3">
        {requests.length ? requests.map((request) => (
          <div key={request.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{request.clientName}</p>
                <p className="mt-1 text-sm text-slate-400">{request.clientEmail}</p>
                <p className="mt-2 text-sm text-slate-300">{request.currency} {request.amount} · {request.paymentType}</p>
                <p className="mt-2 text-sm text-slate-400">{request.description}</p>
                {request.providerLink ? <a href={request.providerLink} target="_blank" className="mt-2 inline-block text-sm text-fuchsia-300 underline">Open payment link</a> : null}
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{request.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {request.status === "awaiting_approval" ? (
                <>
                  <button onClick={() => act("/api/payments/approve", request.id)} disabled={busyId === request.id} className="rounded-2xl bg-fuchsia-300 px-3 py-2 text-xs font-semibold text-slate-950">Approve</button>
                  <button onClick={() => act("/api/payments/decline", request.id)} disabled={busyId === request.id} className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-300">Decline</button>
                </>
              ) : null}
            </div>
          </div>
        )) : <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-400">No payment requests yet.</div>}
      </div>
    </section>
  );
}
