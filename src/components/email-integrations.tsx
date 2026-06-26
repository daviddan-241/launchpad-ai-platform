import type { EmailAccount } from "@/lib/store";

function providerLabel(provider: EmailAccount["provider"]) {
  if (provider === "google") return "Gmail OAuth";
  if (provider === "microsoft") return "Outlook OAuth";
  return "SMTP";
}

export function EmailIntegrations({ accounts }: { accounts: EmailAccount[] }) {
  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Email delivery</p>
        <h2 className="mt-2 text-xl font-semibold text-white">SMTP is the primary real sender path</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          If you want the simplest live setup on Render, use SMTP with your email address, app password, host, and port. OAuth is optional and only needed if you specifically prefer Gmail or Outlook API access.
        </p>
        <div className="mt-5 rounded-3xl border border-white/10 bg-[#161022] p-5">
          <p className="text-sm font-semibold text-white">Recommended</p>
          <p className="mt-2 text-sm text-slate-400">Use the SMTP form below to connect a sender account with email, password/app password, host, and port.</p>
        </div>
        <details className="mt-4 rounded-3xl border border-white/10 bg-[#161022] p-5 text-sm text-slate-300">
          <summary className="cursor-pointer font-semibold text-white">Optional OAuth providers</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <a href="/api/integrations/google/start" className="rounded-3xl border border-white/10 bg-[#120c1e] p-5 transition hover:bg-white/5">
              <p className="text-sm font-semibold text-white">Connect Gmail with OAuth</p>
              <p className="mt-2 text-sm text-slate-400">Requires Google client credentials.</p>
            </a>
            <a href="/api/integrations/microsoft/start" className="rounded-3xl border border-white/10 bg-[#120c1e] p-5 transition hover:bg-white/5">
              <p className="text-sm font-semibold text-white">Connect Outlook with OAuth</p>
              <p className="mt-2 text-sm text-slate-400">Requires Microsoft client credentials.</p>
            </a>
          </div>
        </details>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Connected sender accounts</p>
        <div className="mt-4 space-y-3">
          {accounts.length ? (
            accounts.map((account) => (
              <div key={account.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{account.email}</p>
                    <p className="mt-1 text-sm text-slate-400">{providerLabel(account.provider)} · connected {new Date(account.connectedAt).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">Ready</span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-400">
              No sender accounts connected yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
