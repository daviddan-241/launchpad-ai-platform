"use client";

import { useState } from "react";

type Props = {
  existingEmail?: string;
};

export function SmtpSettingsForm({ existingEmail }: Props) {
  const [form, setForm] = useState({
    fromName: "",
    email: existingEmail || "",
    username: existingEmail || "",
    password: "",
    host: "smtp.gmail.com",
    port: "465",
    secure: true,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/integrations/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromName: form.fromName,
        email: form.email,
        username: form.username,
        password: form.password,
        host: form.host,
        port: Number(form.port),
        secure: form.secure,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    setLoading(false);
    setMessage(payload.error || payload.message || "Saved.");
  }

  async function sendTestEmail() {
    setTesting(true);
    setMessage("");
    const response = await fetch("/api/integrations/smtp/test", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    setTesting(false);
    setMessage(payload.error || payload.message || "Test complete.");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">SMTP connection</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Connect email with username and password</h2>
      <p className="mt-2 text-sm leading-7 text-slate-300">Use your SMTP host, username, and app password or mailbox password where supported.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input value={form.fromName} onChange={(e)=>setForm((s)=>({...s, fromName:e.target.value}))} placeholder="From name" className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.email} onChange={(e)=>setForm((s)=>({...s, email:e.target.value}))} type="email" placeholder="From email" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.username} onChange={(e)=>setForm((s)=>({...s, username:e.target.value}))} placeholder="SMTP username" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.password} onChange={(e)=>setForm((s)=>({...s, password:e.target.value}))} type="password" placeholder="SMTP password or app password" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.host} onChange={(e)=>setForm((s)=>({...s, host:e.target.value}))} placeholder="SMTP host" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
        <input value={form.port} onChange={(e)=>setForm((s)=>({...s, port:e.target.value}))} type="number" placeholder="Port" required className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
        <input type="checkbox" checked={form.secure} onChange={(e)=>setForm((s)=>({...s, secure:e.target.checked}))} />
        Use secure connection
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={loading} className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70">
          {loading ? "Saving..." : "Save SMTP connection"}
        </button>
        <button type="button" onClick={sendTestEmail} disabled={testing} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-70">
          {testing ? "Testing..." : "Send test email"}
        </button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </form>
  );
}
