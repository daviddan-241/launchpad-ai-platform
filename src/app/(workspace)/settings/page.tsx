import { EmailIntegrations } from "@/components/email-integrations";
import { PricingSettingsForm } from "@/components/pricing-settings-form";
import { SmtpSettingsForm } from "@/components/smtp-settings-form";
import { requireCurrentUser } from "@/lib/auth";
import { getUserPreference } from "@/lib/preferences";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireCurrentUser();
  const store = await readStore();
  const accounts = store.emailAccounts.filter((account) => account.userId === user.id);
  const preference = await getUserPreference(user.id);
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Real integrations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Configure OAuth-based sender accounts and app-level production settings.
        </p>
      </section>

      {params.connected ? (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          Connected successfully: {params.connected}
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {params.error}
        </div>
      ) : null}

      <EmailIntegrations accounts={accounts} />
      <SmtpSettingsForm existingEmail={user.email} />
      <PricingSettingsForm preference={preference} />

      <section className="rounded-[30px] border border-white/10 bg-white/5 p-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Environment checklist</p>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p>For a Render deployment using SMTP as the primary email path, start with these environment variables:</p>
          <ul className="space-y-2 text-slate-400">
            <li>• APP_ENCRYPTION_KEY</li>
            <li>• APP_URL</li>
            <li>• DATA_DIR (optional persistent data directory)</li>
            <li>• GEMINI_API_KEY (recommended free AI route)</li>
            <li>• GEMINI_MODEL (optional)</li>
            <li>• FLUTTERWAVE_SECRET_KEY (for real payment links)</li>
            <li>• GROQ_API_KEY (optional fallback)</li>
            <li>• GROQ_MODEL (optional)</li>
            <li>• OLLAMA_BASE_URL (optional self-hosted AI fallback)</li>
            <li>• OLLAMA_MODEL (optional)</li>
          </ul>
          <p className="pt-2 text-slate-400">OAuth credentials are optional and only required if you choose Gmail or Outlook API mode instead of SMTP.</p>
        </div>
      </section>
    </div>
  );
}
