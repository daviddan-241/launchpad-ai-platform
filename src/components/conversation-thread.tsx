"use client";

import { useState } from "react";

type Message = {
  role: "assistant" | "user";
  content: string;
  sentAt: string;
};

type Step = {
  leadId: string;
  leadName: string;
  leadEmail: string;
  company: string;
  status: string;
  conversationState?: string;
  conversationHistory?: Message[];
  lastActionAt: string;
  nextResponseAt?: string;
  followedUp?: boolean;
};

type Campaign = {
  id: string;
  name: string;
  offer: string;
  niche: string;
  price: number;
  currency: string;
  status: string;
  steps: Step[];
};

const STATE_COLOR: Record<string, string> = {
  pending: "bg-slate-500 text-slate-100",
  emailed: "bg-blue-500/80 text-blue-100",
  followed_up: "bg-violet-500/80 text-violet-100",
  in_conversation: "bg-amber-500/80 text-amber-100",
  offer_made: "bg-orange-500/80 text-orange-100",
  payment_requested: "bg-fuchsia-500/80 text-fuchsia-100",
  paid: "bg-emerald-500/80 text-emerald-100",
  declined: "bg-rose-500/80 text-rose-100",
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ThreadView({ campaign, step, onBack, senderName }: {
  campaign: Campaign; step: Step; onBack: () => void; senderName: string;
}) {
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState(`Re: ${campaign.offer}`);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [localHistory, setLocalHistory] = useState<Message[]>(step.conversationHistory ?? []);

  const aiControlled = step.nextResponseAt
    ? new Date(step.nextResponseAt).getTime() > Date.now()
    : false;

  async function sendReply() {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/conversations/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, leadId: step.leadId, message, subject }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Send failed");
      setLocalHistory((prev) => [
        ...prev,
        { role: "assistant", content: message, sentAt: new Date().toISOString() },
      ]);
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const state = step.conversationState ?? step.status ?? "unknown";
  const stateLabel = state.replace(/_/g, " ");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{step.leadName}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_COLOR[state] ?? "bg-slate-600 text-slate-100"}`}>
              {stateLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">{step.company} · {step.leadEmail}</p>
        </div>
        {aiControlled && (
          <div className="flex items-center gap-1.5 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            <span className="text-xs text-fuchsia-200">AI in control</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-5 py-5">
        {localHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-slate-500 text-sm">No messages yet.</p>
            <p className="text-slate-600 text-xs mt-1">The AI will send the first outreach on its next run.</p>
          </div>
        ) : (
          localHistory.map((msg, i) => {
            const isUs = msg.role === "assistant";
            return (
              <div key={i} className={`flex ${isUs ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-[20px] px-4 py-3 ${isUs ? "rounded-tr-md bg-fuchsia-600 text-white" : "rounded-tl-md border border-white/10 bg-white/5 text-slate-200"}`}>
                  <p className={`text-xs font-medium mb-1.5 ${isUs ? "text-fuchsia-200" : "text-slate-400"}`}>
                    {isUs ? senderName : step.leadName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className={`mt-2 text-xs ${isUs ? "text-fuchsia-300/70" : "text-slate-500"}`}>
                    {formatTime(msg.sentAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual reply box */}
      <div className="border-t border-white/10 px-5 py-4">
        {aiControlled && (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/8 px-4 py-3">
            <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-fuchsia-400" />
            <p className="text-xs text-fuchsia-200 leading-5">
              AI is managing this thread. Sending a manual reply will pause the AI for 24 hours and put you in control.
            </p>
          </div>
        )}
        <div className="mb-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-2.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40"
          />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Type a message to ${step.leadName.split(" ")[0]}…`}
          rows={4}
          className="w-full resize-none rounded-2xl border border-white/10 bg-[#1a0f2e] px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
        />
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {aiControlled ? "Sending will pause AI for 24h on this thread." : "AI is not currently scheduled to reply."}
          </p>
          <button
            onClick={sendReply}
            disabled={sending || !message.trim()}
            className="rounded-2xl bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sent ? "Sent ✓" : sending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConversationsInbox({ campaigns, senderName }: { campaigns: Campaign[]; senderName: string }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Flatten all steps across campaigns into one list
  const allThreads = campaigns.flatMap((c) =>
    c.steps.map((s) => ({ ...s, campaignId: c.id, campaignName: c.name, campaignOffer: c.offer })),
  );

  const filtered = allThreads.filter((t) => {
    if (filterState !== "all" && (t.conversationState ?? t.status) !== filterState) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.leadName.toLowerCase().includes(q) || t.company.toLowerCase().includes(q) || t.leadEmail.toLowerCase().includes(q);
    }
    return true;
  });

  // Sort: most recently active first
  const sorted = [...filtered].sort((a, b) => new Date(b.lastActionAt).getTime() - new Date(a.lastActionAt).getTime());

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const selectedStep = selectedCampaign?.steps.find((s) => s.leadId === selectedLeadId);

  if (selectedCampaign && selectedStep) {
    return (
      <div className="h-[calc(100vh-120px)] min-h-[500px] overflow-hidden rounded-[30px] border border-white/10 bg-white/5">
        <ThreadView
          campaign={selectedCampaign}
          step={selectedStep}
          onBack={() => { setSelectedCampaignId(null); setSelectedLeadId(null); }}
          senderName={senderName}
        />
      </div>
    );
  }

  const stateCounts: Record<string, number> = {};
  for (const t of allThreads) {
    const s = t.conversationState ?? t.status ?? "pending";
    stateCounts[s] = (stateCounts[s] ?? 0) + 1;
  }

  const FILTER_TABS = [
    { key: "all", label: `All (${allThreads.length})` },
    { key: "in_conversation", label: `Talking (${stateCounts.in_conversation ?? 0})` },
    { key: "offer_made", label: `Offer sent (${stateCounts.offer_made ?? 0})` },
    { key: "payment_requested", label: `Payment sent (${stateCounts.payment_requested ?? 0})` },
    { key: "emailed", label: `Waiting (${stateCounts.emailed ?? 0})` },
    { key: "declined", label: `Declined (${stateCounts.declined ?? 0})` },
  ];

  return (
    <div className="space-y-5">
      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, company, or email…"
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterState(tab.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${filterState === tab.key ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {sorted.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/3 px-6 py-12 text-center">
          <p className="text-slate-400 text-sm">No conversations yet.</p>
          <p className="text-slate-600 text-xs mt-2">Launch an autonomous campaign in Campaigns → it will create and manage threads automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((t) => {
            const state = t.conversationState ?? t.status ?? "pending";
            const lastMsg = (t.conversationHistory ?? []).slice(-1)[0];
            const msgCount = (t.conversationHistory ?? []).length;
            const hasReply = (t.conversationHistory ?? []).some((m) => m.role === "user");
            const isActive = state === "in_conversation" || state === "offer_made";

            return (
              <button
                key={`${t.campaignId}-${t.leadId}`}
                onClick={() => { setSelectedCampaignId(t.campaignId); setSelectedLeadId(t.leadId); }}
                className="w-full rounded-[24px] border border-white/8 bg-white/5 px-5 py-4 text-left transition hover:border-fuchsia-400/20 hover:bg-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-700 text-sm font-bold text-white">
                      {t.leadName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white text-sm">{t.leadName}</p>
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Active conversation" />}
                        {hasReply && <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">replied</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{t.company} · {t.leadEmail}</p>
                      {lastMsg && (
                        <p className="mt-1.5 text-xs text-slate-500 truncate">
                          <span className={lastMsg.role === "assistant" ? "text-fuchsia-400/80" : "text-slate-300"}>
                            {lastMsg.role === "assistant" ? "You: " : `${t.leadName.split(" ")[0]}: `}
                          </span>
                          {lastMsg.content.slice(0, 90)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_COLOR[state] ?? "bg-slate-600 text-slate-100"}`}>
                      {state.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-600">{timeAgo(t.lastActionAt)}</span>
                    {msgCount > 0 && (
                      <span className="text-xs text-slate-600">{msgCount} msg{msgCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 ml-13">
                  <p className="text-xs text-slate-600">{t.campaignName} · {t.campaignOffer}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
