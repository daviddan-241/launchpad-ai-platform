"use client";

import { useState } from "react";

export function ReplyGenerator() {
  const [context, setContext] = useState("We like the product but timing is bad until next month.");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateReply() {
    setLoading(true);
    const response = await fetch("/api/inbox/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: context }),
    });
    const payload = (await response.json()) as { draft: string };
    setDraft(payload.draft);
    setLoading(false);
  }

  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">AI reply lab</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Generate a reply for free</h2>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        className="mt-4 min-h-[120px] w-full rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
      />
      <button
        type="button"
        onClick={generateReply}
        disabled={loading}
        className="mt-4 rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70"
      >
        {loading ? "Generating..." : "Generate reply"}
      </button>
      {draft ? (
        <div className="mt-4 rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm leading-7 text-slate-200">
          {draft}
        </div>
      ) : null}
    </div>
  );
}
