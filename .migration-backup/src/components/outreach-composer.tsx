"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Account = {
  id: string;
  provider: "google" | "microsoft" | "smtp";
  email: string;
};

export function OutreachComposer({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const savedDraft = typeof window !== "undefined" ? window.localStorage.getItem("leadforge-outreach-draft") : null;
  const parsedDraft = (() => {
    if (!savedDraft) return null;
    try {
      return JSON.parse(savedDraft) as { accountId?: string; to?: string; subject?: string; body?: string; delayMinutes?: string };
    } catch {
      if (typeof window !== "undefined") window.localStorage.removeItem("leadforge-outreach-draft");
      return null;
    }
  })();

  const [accountId, setAccountId] = useState(parsedDraft?.accountId ?? accounts[0]?.id ?? "");
  const [to, setTo] = useState(parsedDraft?.to ?? "");
  const [subject, setSubject] = useState(parsedDraft?.subject ?? "Quick idea to help your team book more qualified calls");
  const [body, setBody] = useState(
    parsedDraft?.body ??
      "Hi there,\n\nI noticed your team may be balancing growth with limited outbound capacity. I can help design a stronger web presence and outreach system that turns more visitors into booked conversations.\n\nIf useful, I can send a short proposal tailored to your business.\n\nBest,",
  );
  const [delayMinutes, setDelayMinutes] = useState(parsedDraft?.delayMinutes ?? "0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "leadforge-outreach-draft",
      JSON.stringify({ accountId, to, subject, body, delayMinutes }),
    );
  }, [accountId, to, subject, body, delayMinutes]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/outreach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, to, subject, body, delayMinutes: Number(delayMinutes || 0) }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!response.ok) {
      setMessage(payload.error || "Could not create outreach job.");
      setLoading(false);
      return;
    }

    setMessage(payload.message || "Outreach created.");
    if (Number(delayMinutes || 0) === 0) {
      setTo("");
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Real outreach</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Send or schedule from your connected account</h2>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        Use only your own approved contacts or leads you have a legitimate reason to contact.
      </p>

      <div className="mt-4 grid gap-3">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40"
          required
        >
          <option value="">Select sender account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.email} ({account.provider})
            </option>
          ))}
        </select>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          type="email"
          placeholder="Recipient email"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[180px] rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <input
          value={delayMinutes}
          onChange={(e) => setDelayMinutes(e.target.value)}
          type="number"
          min="0"
          step="1"
          placeholder="Delay in minutes"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !accounts.length}
          className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Working..." : Number(delayMinutes || 0) > 0 ? "Queue email" : "Send now"}
        </button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
