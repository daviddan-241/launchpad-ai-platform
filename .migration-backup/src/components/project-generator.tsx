"use client";

import { useEffect, useMemo, useState } from "react";

type GeneratedProject = {
  title: string;
  summary: string;
  proposal: string;
  features: string[];
  files: Array<{ path: string; content: string }>;
};

export function ProjectGenerator() {
  const [prompt, setPrompt] = useState(() => {
    if (typeof window === "undefined") return "SaaS landing page for a web design and outreach agency";
    return window.localStorage.getItem("leadforge-project-prompt") || "SaaS landing page for a web design and outreach agency";
  });
  const [result, setResult] = useState<GeneratedProject | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("leadforge-project-result");
    if (!saved) return null;
    try {
      return JSON.parse(saved) as GeneratedProject;
    } catch {
      window.localStorage.removeItem("leadforge-project-result");
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("leadforge-project-prompt", prompt);
  }, [prompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (result) {
      window.localStorage.setItem("leadforge-project-result", JSON.stringify(result));
    }
  }, [result]);
  const previewHtml = useMemo(() => {
    if (!result) return "";
    const html = result.files.find((file) => file.path === "index.html")?.content ?? "";
    const css = result.files.find((file) => file.path === "styles.css")?.content ?? "";
    const js = result.files.find((file) => file.path === "app.js")?.content ?? "";
    return html
      .replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`)
      .replace('<script src="app.js"></script>', `<script>${js}</script>`);
  }, [result]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/projects/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const payload = (await response.json().catch(() => ({}))) as GeneratedProject & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not generate project.");
      }
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate project.");
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
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">MVP generator</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Generate a starter web project and proposal</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Describe the kind of website you want. LeadForge will generate a proposal angle, feature list, and a real static HTML/CSS/JS starter package.
        </p>

        <div className="mt-4 rounded-[28px] border border-white/10 bg-[#0b0610] p-3 sm:p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
            placeholder="Describe the project you want to generate"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Works well for landing pages, agency sites, SaaS pages, portfolios, and business MVPs.</p>
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70"
            >
              {loading ? "Generating..." : "Generate MVP"}
            </button>
          </div>
          {error ? <p className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        </div>
      </section>

      {result ? (
        <>
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Generated package</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{result.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{result.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.features.map((feature) => (
                <div key={feature} className="rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm text-slate-200">
                  {feature}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm leading-7 text-slate-200">
              {result.proposal}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Files</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Download the generated starter</h2>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {result.files.map((file) => (
                  <div key={file.path} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{file.path}</p>
                        <p className="mt-1 text-xs text-slate-500">{file.content.length} characters</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadFile(file.path, file.content)}
                        className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5"
                      >
                        Download
                      </button>
                    </div>
                    <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/8 bg-[#0b0610] p-3 text-xs text-slate-300">
{file.content}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Live preview</p>
              <div className="mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-white">
                <iframe title="Generated project preview" srcDoc={previewHtml} className="h-[720px] w-full bg-white" />
              </div>
            </section>
          </section>
        </>
      ) : null}
    </div>
  );
}
