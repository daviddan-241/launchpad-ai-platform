"use client";

import { useEffect, useRef, useState } from "react";

type Snapshot = {
  workers: Array<{ name: string; role: string; status: string; load: number }>;
  runningTasks: Array<{ id: string; title: string; owner: string; status: string; source: string; detail: string }>;
  scheduledFollowUps: Array<{ id: string; to: string; subject: string; sendAt: string; status: string }>;
  replyThreads: Array<{ id: string; from: string; company: string; subject: string; preview: string; sentiment: string; receivedAt: string }>;
  timeline: Array<{ id: string; type: string; title: string; detail: string; status: string; createdAt: string }>;
};

function StatusDot({ live }: { live: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-60" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-fuchsia-300" : "bg-slate-600"}`} />
    </span>
  );
}

export function ActivityDashboard({ initial }: { initial: Snapshot }) {
  const [data, setData] = useState(initial);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString());
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const es = new EventSource("/api/activity/stream");
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as Snapshot;
          setData(payload);
          setLastRefresh(new Date().toLocaleTimeString());
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimer);
      esRef.current?.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Workspace activity</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Live autonomous workspace</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Real-time stream — workers, follow-ups, inbox replies, and a full event timeline.
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#161022] px-3 py-2">
            <StatusDot live={connected} />
            <span className="text-xs text-slate-300">{connected ? `Live · ${lastRefresh}` : "Connecting..."}</span>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Workers</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {data.workers.map((worker) => (
            <div key={worker.name} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusDot live={worker.status === "active"} />
                  <p className="font-medium text-white">{worker.name}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] ${worker.status === "active" ? "border border-amber-400/20 bg-amber-400/10 text-amber-100" : "border border-white/10 bg-white/5 text-slate-300"}`}>{worker.status}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{worker.role}</p>
              <div className="mt-3">
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-fuchsia-400/60 transition-all" style={{ width: `${Math.min(100, worker.load * 4 + (worker.status === "active" ? 15 : 3))}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Running tasks</p>
          <div className="mt-4 space-y-3">
            {data.runningTasks.length ? data.runningTasks.map((task) => (
              <div key={task.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{task.title}</p>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-300">{task.status}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{task.detail}</p>
                <p className="mt-1 text-[10px] text-slate-600">{task.source} · {task.owner}</p>
              </div>
            )) : <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-500">No running tasks. Use Chat to queue work.</div>}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Scheduled follow-ups</p>
          <div className="mt-4 space-y-3">
            {data.scheduledFollowUps.length ? data.scheduledFollowUps.map((job) => (
              <div key={job.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{job.subject}</p>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-300">{job.status}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">To {job.to}</p>
                <p className="mt-1 text-[10px] text-amber-300/70">{new Date(job.sendAt).toLocaleString()}</p>
              </div>
            )) : <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-500">No queued follow-ups. Say "follow up with X in 20 minutes".</div>}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Inbox replies</p>
          <div className="mt-4 space-y-3">
            {data.replyThreads.length ? data.replyThreads.map((thread) => (
              <div key={thread.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{thread.from}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{thread.company}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] ${thread.sentiment === "positive" ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : thread.sentiment === "negative" ? "border border-rose-400/20 bg-rose-400/10 text-rose-200" : "border border-white/10 bg-white/5 text-slate-300"}`}>{thread.sentiment}</span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-200">{thread.subject}</p>
                <p className="mt-1 text-xs text-slate-400">{thread.preview}</p>
                <p className="mt-1.5 text-[10px] text-slate-600">{thread.receivedAt}</p>
              </div>
            )) : <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-500">No inbox replies yet. Add an email account in Settings to start monitoring.</div>}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Event timeline</p>
          <div className="mt-4 space-y-2">
            {data.timeline.length ? data.timeline.map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-3xl border border-white/8 bg-[#161022] p-3.5">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${event.status === "done" ? "bg-amber-300" : event.status === "failed" ? "bg-rose-400" : "bg-slate-600"}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">{event.title}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{event.detail}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{new Date(event.createdAt).toLocaleString()} · {event.type}</p>
                </div>
              </div>
            )) : <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-500">No timeline events. Start using the workspace to see activity here.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
