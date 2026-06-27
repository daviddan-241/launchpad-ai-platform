"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateWorkflowForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [actions, setActions] = useState("Enrich lead\nScore fit and intent\nAssign owner\nSend follow-up");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, actions }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; workflow?: { name: string } };

    if (!response.ok) {
      setMessage(payload.error || "Could not create workflow.");
      setLoading(false);
      return;
    }

    setMessage(`Workflow created: ${payload.workflow?.name ?? name}`);
    setName("");
    setTrigger("");
    setActions("Enrich lead\nScore fit and intent\nAssign owner\nSend follow-up");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Create workflow</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Add automation without paying for a builder</h2>
      <div className="mt-4 grid gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workflow name"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <input
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="Trigger"
          className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
          required
        />
        <textarea
          value={actions}
          onChange={(e) => setActions(e.target.value)}
          placeholder="One action per line"
          className="min-h-[130px] rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Create workflow"}
        </button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
