import { useState } from "react";
import { Link } from "wouter";
import { useDiscoverLeads } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Building2, MapPin, Mail, Globe, CheckCircle2, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVATARS = ["bg-indigo-500","bg-blue-500","bg-purple-500","bg-pink-500","bg-rose-500","bg-orange-500","bg-green-500","bg-teal-500"];
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATARS[Math.abs(h) % AVATARS.length];
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

const PRESETS = [
  { query: "SaaS companies in USA", industry: "Software", location: "USA" },
  { query: "Marketing agencies in NYC", industry: "Marketing", location: "New York" },
  { query: "E-commerce startups", industry: "E-commerce", location: "USA" },
  { query: "Healthcare tech companies", industry: "Healthcare", location: "USA" },
];

export default function LeadDiscover() {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const discoverMutation = useDiscoverLeads();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSaved(new Set());
    discoverMutation.mutate({ data: { query: query.trim(), industry: industry || undefined, location: location || undefined, limit: 10 } });
  };

  const usePreset = (p: typeof PRESETS[number]) => {
    setQuery(p.query); setIndustry(p.industry); setLocation(p.location);
  };

  const leads: any[] = (discoverMutation.data as any) ?? [];

  // Leads are already saved to DB by the discover endpoint — they show as "saved"
  const markSaved = (id: number) => setSaved(prev => new Set(prev).add(id));

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <Link href="/leads">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Leads
        </button>
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">AI Lead Discovery</h1>
        <p className="text-sm text-gray-500 mt-0.5">Describe who you're looking for — AI generates real leads and saves them to your pipeline</p>
      </div>

      {/* Search card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3 space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">What kind of companies are you looking for?</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder='e.g. "B2B SaaS startups raising Series A" or "Digital marketing agencies"'
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Industry <span className="text-gray-400 font-normal">(optional)</span></Label>
              <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                style={{ fontSize: 16 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Location <span className="text-gray-400 font-normal">(optional)</span></Label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. San Francisco, USA"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                style={{ fontSize: 16 }} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={!query.trim() || discoverMutation.isPending}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors">
                {discoverMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                  : <><Sparkles className="w-4 h-4" /> Discover Leads</>}
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick searches:</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.query} type="button" onClick={() => usePreset(p)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 transition-colors">
                  {p.query}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Error */}
      {discoverMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Discovery failed — check that GROQ_API_KEY is set in your environment.
        </div>
      )}

      {/* Results */}
      {leads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{leads.length} leads found — all saved to your pipeline</p>
            <Link href="/leads">
              <button className="text-sm text-indigo-600 hover:underline">View all leads →</button>
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {leads.map((lead: any, i: number) => (
              <div key={lead.id ?? i} className="flex items-center gap-4 px-5 py-4 hover:bg-indigo-50/30 transition-colors group">
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl ${avatarColor(lead.companyName)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {initials(lead.companyName)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{lead.companyName}</p>
                    {lead.score != null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lead.score >= 75 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {lead.score}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-0.5">
                    {lead.contactName && <span className="text-xs text-gray-500">{lead.contactName}</span>}
                    {lead.industry && <span className="flex items-center gap-1 text-xs text-gray-400"><Building2 className="w-3 h-3" />{lead.industry}</span>}
                    {lead.location && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{lead.location}</span>}
                  </div>
                </div>

                {/* Contact links */}
                <div className="hidden sm:flex items-center gap-2">
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="text-gray-300 hover:text-indigo-500 transition-colors" title={lead.email}>
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {lead.website && (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-indigo-500 transition-colors" title={lead.website}>
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Saved indicator — leads are saved automatically by the discover endpoint */}
                <div className="flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Saved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {discoverMutation.isSuccess && leads.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">No leads found — try broadening your search</p>
        </div>
      )}
    </div>
  );
}
