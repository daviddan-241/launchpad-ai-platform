"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function LeadsCsvPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/leads/csv", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });
      const data = await res.json() as { imported?: number; skipped?: string[]; error?: string };
      if (data.error) throw new Error(data.error);
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? [] });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-60"
      >
        {importing ? "Importing..." : "Import CSV"}
      </button>
      <a
        href="/api/leads/csv"
        download
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
      >
        Export CSV
      </a>
      {result && (
        <span className="text-xs text-fuchsia-200">
          {result.imported} lead{result.imported !== 1 ? "s" : ""} imported
          {result.skipped.length ? ` · ${result.skipped.length} skipped` : ""}
        </span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
