"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateLeadForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    title: "",
    company: "",
    industry: "",
    region: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; lead?: { name: string } };

    if (!response.ok) {
      setMessage(payload.error || "Could not create lead.");
      setLoading(false);
      return;
    }

    setMessage(`Lead created: ${payload.lead?.name ?? form.name}`);
    setForm({ name: "", title: "", company: "", industry: "", region: "", email: "" });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Add lead</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Create a new prospect for free</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[
          ["name", "Lead name"],
          ["title", "Job title"],
          ["company", "Company"],
          ["industry", "Industry"],
          ["region", "Region"],
          ["email", "Work email"],
        ].map(([key, label]) => (
          <input
            key={key}
            value={form[key as keyof typeof form]}
            onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
            placeholder={label}
            className="rounded-2xl border border-white/10 bg-[#071121] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-300/40"
            required
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Create lead"}
        </button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
