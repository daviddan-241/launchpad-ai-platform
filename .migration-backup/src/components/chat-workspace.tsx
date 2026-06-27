"use client";

import { useEffect, useMemo, useState } from "react";

type CommandResponse = {
  prompt: string;
  assistantMessage: string;
  summary: string;
  actions: Array<{
    type:
      | "lead_search"
      | "campaign_plan"
      | "proposal"
      | "project_generated"
      | "outreach_draft"
      | "outreach_queued"
      | "blocked";
    title: string;
    detail: string;
    status: "done" | "pending" | "blocked";
  }>;
  leads: Array<{
    id: string;
    name: string;
    title: string;
    company: string;
    fitScore: number;
    intentScore: number;
    region: string;
    email: string;
  }>;
  research: Array<{
    domain: string;
    url: string;
    title: string;
    description: string;
    summary: string;
  }>;
  plan: {
    audience: string;
    objective: string;
    steps: string[];
    guardrails: string[];
  };
  proposal: {
    title: string;
    scope: string[];
    message: string;
  };
  project: {
    title: string;
    summary: string;
    proposal: string;
    features: string[];
    files: Array<{ path: string; content: string }>;
  } | null;
  outreach: {
    subject: string;
    body: string;
    recipients: Array<{ id: string; email: string; name: string; company: string }>;
    queuedJobs?: number;
  } | null;
};

const starterPrompts = [
  "Find fintech growth leads in Nigeria and build a 5-touch sequence",
  "Create a website proposal for a logistics company with follow-up plan",
  "Generate an MVP landing page for my web agency",
  "Send now to my saved leads a proposal for a better website",
];

export function ChatWorkspace() {
  const [prompt, setPrompt] = useState(() => {
    if (typeof window === "undefined") return starterPrompts[0];
    return window.localStorage.getItem("leadforge-chat-prompt") || starterPrompts[0];
  });
  const [result, setResult] = useState<CommandResponse | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("leadforge-chat-result");
    if (!saved) return null;
    try {
      return JSON.parse(saved) as CommandResponse;
    } catch {
      window.localStorage.removeItem("leadforge-chat-result");
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("leadforge-chat-prompt", prompt);
  }, [prompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (result) {
      window.localStorage.setItem("leadforge-chat-result", JSON.stringify(result));
    }
  }, [result]);

  const projectPreview = useMemo(() => {
    if (!result?.project) return "";
    const html = result.project.files.find((file) => file.path === "index.html")?.content ?? "";
    const css = result.project.files.find((file) => file.path === "styles.css")?.content ?? "";
    const js = result.project.files.find((file) => file.path === "app.js")?.content ?? "";

    return html
      .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`)
      .replace('<script src="app.js"></script>', `<script>${js}</script>`);
  }, [result]);

  async function runCommand(input?: string) {
    const value = (input ?? prompt).trim();
    if (!value) return;

    setLoading(true);
    setError("");
    if (input) setPrompt(input);

    try {
      const response = await fetch("/api/chat/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });

      const payload = (await response.json().catch(() => ({}))) as CommandResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not run command.");
      }
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run command.");
    } finally {
      setLoading(false);
    }
  }

  function downloadFile(path: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = path;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Assistant</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Run the whole workspace from chat</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Search saved leads, generate web MVP projects, build campaigns, draft outreach, and queue real sends from one command center.
            </p>
          </div>
          <div className="hidden rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-50 sm:block">
            Chat-first workflow
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {starterPrompts.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => runCommand(item)}
              className="shrink-0 rounded-full border border-white/10 bg-[#161022] px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-[28px] border border-white/10 bg-[#0b0610] p-3 sm:p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Find my best leads, generate a proposal, create an MVP site, and prepare outreach..."
            className="min-h-[132px] w-full resize-none rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">For real sending, connect Gmail/Outlook in Settings first.</p>
            <button
              type="button"
              onClick={() => runCommand()}
              disabled={loading}
              className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Running..." : "Run command"}
            </button>
          </div>
          {error ? <p className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        </div>
      </section>

      {result ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Conversation</p>
              <div className="mt-4 space-y-4">
                <div className="ml-auto max-w-[88%] rounded-[28px] border border-fuchsia-300/20 bg-fuchsia-300/10 p-4 text-sm leading-7 text-fuchsia-50">
                  {result.prompt}
                </div>
                <div className="max-w-[92%] rounded-[28px] border border-white/10 bg-[#161022] p-4 text-sm leading-7 text-slate-200">
                  {result.assistantMessage}
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Execution log</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{result.summary}</p>
              <div className="mt-4 space-y-3">
                {result.actions.map((action) => (
                  <div key={`${action.type}-${action.title}`} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{action.title}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          action.status === "done"
                            ? "border border-amber-400/20 bg-amber-400/10 text-amber-100"
                            : action.status === "blocked"
                              ? "border border-rose-400/20 bg-rose-400/10 text-rose-100"
                              : "border border-white/10 bg-white/5 text-slate-300"
                        }`}
                      >
                        {action.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{action.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Lead matches</p>
              <div className="mt-4 space-y-3">
                {result.leads.length ? (
                  result.leads.map((lead) => (
                    <div key={lead.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{lead.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{lead.title} · {lead.company}</p>
                          <p className="mt-2 text-sm text-slate-300">{lead.region} · {lead.email}</p>
                        </div>
                        <div className="flex flex-col gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-white/10 px-3 py-1">Fit {lead.fitScore}</span>
                          <span className="rounded-full border border-white/10 px-3 py-1">Intent {lead.intentScore}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-400">
                    No current lead matches found in your saved workspace data.
                  </div>
                )}
              </div>

              {result.research.length ? (
                <div className="mt-5 rounded-3xl border border-white/8 bg-[#161022] p-4">
                  <p className="text-sm font-semibold text-white">Research notes</p>
                  <div className="mt-3 space-y-3">
                    {result.research.map((item) => (
                      <div key={item.url} className="rounded-2xl border border-white/8 p-3">
                        <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-fuchsia-300 underline">{item.title || item.domain}</a>
                        <p className="mt-1 text-xs text-slate-500">{item.domain}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Campaign plan</p>
              <p className="mt-3 text-sm text-slate-400">Audience</p>
              <p className="text-white">{result.plan.audience}</p>
              <p className="mt-3 text-sm text-slate-400">Objective</p>
              <p className="text-white">{result.plan.objective}</p>
              <div className="mt-4 space-y-3">
                {result.plan.steps.map((step) => (
                  <div key={step} className="rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm text-slate-200">
                    {step}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
                <p className="text-sm font-semibold text-white">Guardrails</p>
                <ul className="mt-2 space-y-2 text-sm text-amber-50/90">
                  {result.plan.guardrails.map((rule) => (
                    <li key={rule}>• {rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Proposal draft</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{result.proposal.title}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.proposal.scope.map((item) => (
                  <div key={item} className="rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm leading-7 text-slate-200">
                {result.proposal.message}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Outreach</p>
              {result.outreach ? (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                    <p className="text-sm text-slate-400">Subject</p>
                    <p className="mt-1 text-white">{result.outreach.subject}</p>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-[#161022] p-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {result.outreach.body}
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                    <p className="text-sm font-medium text-white">Recipients</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      {result.outreach.recipients.length ? (
                        result.outreach.recipients.map((recipient) => (
                          <p key={recipient.id}>{recipient.name} · {recipient.company} · {recipient.email}</p>
                        ))
                      ) : (
                        <p>No matched recipients yet.</p>
                      )}
                    </div>
                    {result.outreach.queuedJobs ? (
                      <p className="mt-3 text-sm text-emerald-200">Queued jobs: {result.outreach.queuedJobs}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-400">
                  Add email/outreach/send language in your prompt to generate a draft here.
                </div>
              )}
            </div>
          </section>

          {result.project ? (
            <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Generated project</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{result.project.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{result.project.summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {result.project.features.map((feature) => (
                    <div key={feature} className="rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm text-slate-200">
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {result.project.files.map((file) => (
                    <div key={file.path} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{file.path}</p>
                        <button
                          type="button"
                          onClick={() => downloadFile(file.path, file.content)}
                          className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Preview</p>
                <div className="mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-white">
                  <iframe title="Generated project preview" srcDoc={projectPreview} className="h-[720px] w-full bg-white" />
                </div>
              </section>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
