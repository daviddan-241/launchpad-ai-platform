"use client";

import { useState } from "react";

type InboxMessage = {
  id: string;
  from: string;
  fromEmail?: string;
  company: string;
  subject: string;
  preview: string;
  emailBody?: string;
  sentiment: string;
  recommendedReply: string;
  receivedAt: string;
  leadId?: string;
  campaignId?: string;
  externalMessageId?: string;
  replySent?: boolean;
  replySentAt?: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SENTIMENT_STYLE: Record<string, string> = {
  Positive: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  Neutral: "border-white/15 bg-white/5 text-slate-400",
  "At Risk": "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

function ThreadDetail({ msg, onBack }: { msg: InboxMessage; onBack: () => void }) {
  const [reply, setReply] = useState(msg.recommendedReply);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(msg.replySent ?? false);
  const [error, setError] = useState("");

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msg.id, replyText: reply }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Send failed");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{msg.from}</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${SENTIMENT_STYLE[msg.sentiment] ?? SENTIMENT_STYLE.Neutral}`}>
              {msg.sentiment}
            </span>
            {msg.replySent && (
              <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-0.5 text-xs text-fuchsia-300">
                replied ✓
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">
            {msg.fromEmail ?? msg.company} · {timeAgo(msg.receivedAt)}
          </p>
        </div>
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Subject</p>
          <p className="mt-1 text-base font-semibold text-white">{msg.subject}</p>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-[#140c22] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500 mb-3">Message</p>
          {msg.emailBody ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{msg.emailBody}</p>
          ) : (
            <p className="text-sm leading-7 text-slate-300">{msg.preview}</p>
          )}
        </div>

        {msg.leadId && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/8 px-4 py-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <p className="text-xs text-amber-200">Matched to a known lead in your CRM</p>
          </div>
        )}
        {msg.campaignId && (
          <div className="flex items-center gap-2 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/8 px-4 py-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            <p className="text-xs text-fuchsia-200">Routed into autonomous campaign thread</p>
          </div>
        )}
      </div>

      {/* Reply composer */}
      <div className="border-t border-white/10 px-5 py-4">
        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-fuchsia-300">AI-suggested reply</p>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={5}
          disabled={sent}
          className="w-full resize-none rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:opacity-60"
        />
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {sent ? `Sent to ${msg.fromEmail ?? msg.from}` : `Replying to ${msg.fromEmail ?? msg.from}`}
          </p>
          {sent ? (
            <span className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">
              Sent ✓
            </span>
          ) : (
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              className="rounded-2xl bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send reply"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InboxThread({ messages: initialMessages }: { messages: InboxMessage[] }) {
  const [messages, setMessages] = useState<InboxMessage[]>(initialMessages);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "Positive" | "Neutral" | "At Risk" | "unread">("all");
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);

  async function pollNow() {
    setPolling(true);
    setPollResult(null);
    try {
      const res = await fetch("/api/inbox/poll", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; newMessages?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Poll failed");
      const count = data.newMessages ?? 0;
      setPollResult(count > 0 ? `${count} new message${count !== 1 ? "s" : ""} pulled in` : "No new messages");

      // Reload inbox data from server
      const pageRes = await fetch("/api/inbox/list");
      if (pageRes.ok) {
        const updated = (await pageRes.json()) as { inbox?: InboxMessage[] };
        if (updated.inbox) setMessages(updated.inbox);
      }
    } catch (e) {
      setPollResult(e instanceof Error ? e.message : "Poll failed");
    } finally {
      setPolling(false);
      setTimeout(() => setPollResult(null), 5000);
    }
  }

  const filtered = messages.filter((m) => {
    if (filter === "unread") return !m.replySent;
    if (filter !== "all") return m.sentiment === filter;
    return true;
  });

  const selectedMsg = messages.find((m) => m.id === selected);

  if (selectedMsg) {
    return (
      <ThreadDetail
        msg={selectedMsg}
        onBack={() => setSelected(null)}
      />
    );
  }

  const positive = messages.filter((m) => m.sentiment === "Positive").length;
  const atRisk = messages.filter((m) => m.sentiment === "At Risk").length;
  const unreplied = messages.filter((m) => !m.replySent).length;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total replies", value: messages.length },
          { label: "Positive signals", value: positive },
          { label: "Need reply", value: unreplied },
        ].map((s) => (
          <div key={s.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "unread", "Positive", "Neutral", "At Risk"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${filter === f ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"}`}
            >
              {f === "all" ? `All (${messages.length})` : f === "unread" ? `Unreplied (${unreplied})` : f === "Positive" ? `Positive (${positive})` : f === "At Risk" ? `At Risk (${atRisk})` : "Neutral"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {pollResult && (
            <span className="text-xs text-slate-400">{pollResult}</span>
          )}
          <button
            onClick={pollNow}
            disabled={polling}
            className="flex items-center gap-2 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold text-fuchsia-200 transition hover:bg-fuchsia-400/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={polling ? "animate-spin" : ""}>⟳</span>
            {polling ? "Polling…" : "Poll now"}
          </button>
        </div>
      </div>

      {/* Message list */}
      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/3 px-6 py-14 text-center">
          <p className="text-slate-400 text-sm">No messages yet.</p>
          <p className="text-slate-600 text-xs mt-2">
            Connect a Gmail, Outlook, or SMTP account in Settings, then click "Poll now" to pull in replies.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => (
            <button
              key={msg.id}
              onClick={() => setSelected(msg.id)}
              className="w-full rounded-[24px] border border-white/8 bg-white/5 px-5 py-4 text-left transition hover:border-fuchsia-400/20 hover:bg-white/8"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-700 to-violet-800 text-sm font-bold text-white">
                    {msg.from[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white text-sm">{msg.from}</p>
                      {!msg.replySent && (
                        <span className="h-2 w-2 rounded-full bg-fuchsia-400" title="Unreplied" />
                      )}
                      {msg.leadId && (
                        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">known lead</span>
                      )}
                      {msg.campaignId && (
                        <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-2 py-0.5 text-xs text-fuchsia-300">campaign</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{msg.company} · {msg.fromEmail}</p>
                    <p className="mt-1 text-xs font-medium text-slate-300 truncate">{msg.subject}</p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">{msg.preview}</p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${SENTIMENT_STYLE[msg.sentiment] ?? SENTIMENT_STYLE.Neutral}`}>
                    {msg.sentiment}
                  </span>
                  <span className="text-xs text-slate-600">{timeAgo(msg.receivedAt)}</span>
                  {msg.replySent && (
                    <span className="text-xs text-fuchsia-400">replied ✓</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
