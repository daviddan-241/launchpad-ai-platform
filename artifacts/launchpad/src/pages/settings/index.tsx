import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, Loader2, Trash2, Bot, Terminal, AlertCircle, ExternalLink } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SettingsData {
  emailConnected: boolean;
  email: string | null;
  provider: string | null;
  emailAccounts: Array<{ id: number; email: string; provider: string }>;
  ai: { name: string; model: string; local: boolean };
  ollamaSetup: { recommended: string; size: string; commands: string[] };
}

export default function Settings() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; hint?: string } | null>(null);

  const loadSettings = async () => {
    try {
      const d = await fetch(`${API}/api/settings`).then(r => r.json());
      setData(d);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadSettings(); }, []);

  // Pre-fill email if already connected
  useEffect(() => {
    if (data?.email && !email) setEmail(data.email);
  }, [data?.email]);

  const save = async () => {
    if (!email.trim() || !password.trim()) return;
    setSaving(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/api/settings/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const json = await r.json();
      if (r.ok) {
        setResult({ ok: true, message: json.message });
        setPassword("");
        await loadSettings();
      } else {
        setResult({ ok: false, message: json.error ?? "Connection failed", hint: json.hint });
      }
    } catch {
      setResult({ ok: false, message: "Network error — check your connection" });
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async (id: number) => {
    await fetch(`${API}/api/settings/email/${id}`, { method: "DELETE" });
    setResult(null);
    await loadSettings();
  };

  const detectProvider = (e: string): string | null => {
    const d = e.split("@")[1]?.toLowerCase() ?? "";
    if (d.includes("gmail") || d.includes("googlemail")) return "Gmail";
    if (d.includes("outlook") || d.includes("hotmail") || d.includes("live")) return "Outlook";
    if (d.includes("yahoo")) return "Yahoo";
    if (d.includes("icloud") || d.includes("me.com") || d.includes("mac.com")) return "iCloud";
    return null;
  };
  const detectedProvider = detectProvider(email);
  const isGmail = detectedProvider === "Gmail";

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add your email once — everything else works automatically.
        </p>
      </div>

      {/* ── Email Setup ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4 text-primary" />
            Email Account
          </CardTitle>
          <CardDescription>
            Connect your email to send campaigns. Works with Gmail, Outlook, Yahoo, iCloud, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected accounts */}
          {data?.emailAccounts && data.emailAccounts.length > 0 && (
            <div className="space-y-2">
              {data.emailAccounts.map(acc => (
                <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{acc.email}</p>
                    <p className="text-xs text-muted-foreground">{acc.provider} · Ready to send campaigns</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => disconnect(acc.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email-input">Your Email</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setResult(null); }}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
              />
              {detectedProvider && (
                <p className="text-xs text-muted-foreground">
                  {detectedProvider} detected — SMTP auto-configured ✓
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pw-input">
                {isGmail ? "Gmail App Password" : "Password"}
              </Label>
              <Input
                id="pw-input"
                type="password"
                placeholder={isGmail ? "16-char app password (not your login password)" : "Your email password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setResult(null); }}
                autoComplete="current-password"
              />
              {isGmail && (
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Gmail requires an App Password.{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    Create one here <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  (Google Account → Security → 2-Step Verification → App passwords)
                </div>
              )}
            </div>

            {result && (
              <div className={`flex items-start gap-2 p-3 rounded-xl text-sm border ${
                result.ok
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900"
              }`}>
                {result.ok
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium">{result.message}</p>
                  {result.hint && <p className="text-xs mt-1 opacity-80">{result.hint}</p>}
                </div>
              </div>
            )}

            <Button onClick={save} disabled={!email.trim() || !password.trim() || saving} className="w-full h-11">
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting & verifying...</>
                : data?.emailConnected ? "Update Email" : "Save & Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Provider ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="w-4 h-4 text-primary" />
            AI Model
          </CardTitle>
          <CardDescription>
            Currently: <strong>{data?.ai?.name ?? "Groq"}</strong> ({data?.ai?.model ?? "llama-3.3-70b"})
            {data?.ai?.local ? " — local, private, free" : " — cloud, free tier"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.ai?.local ? (
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm">Ollama running locally — private & free</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                To run AI locally (offline, private, free) — download Ollama with{" "}
                <strong>{data?.ollamaSetup?.recommended ?? "qwen2.5:0.5b"}</strong> model ({data?.ollamaSetup?.size ?? "397 MB"}):
              </p>
              <div className="space-y-1.5">
                {(data?.ollamaSetup?.commands ?? [
                  "brew install ollama",
                  "ollama pull qwen2.5:0.5b",
                  "ollama serve",
                ]).map((cmd, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted border border-border">
                    <Terminal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <code className="text-xs font-mono select-all">{cmd}</code>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Then add <code className="bg-muted px-1.5 py-0.5 rounded text-xs">OLLAMA_BASE_URL=http://localhost:11434</code> to your environment and restart the server.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
