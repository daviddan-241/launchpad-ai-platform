import { useState, useCallback } from "react";
import { Link } from "wouter";
import { useGetLeads } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ExternalLink, Mail, ChevronRight, Loader2 } from "lucide-react";

const STATUSES = ["All", "New", "Warm", "Hot", "Qualified", "Cold", "Lost"];

const STATUS_COLORS: Record<string, string> = {
  Hot: "bg-red-100 text-red-700 border-red-200",
  Warm: "bg-orange-100 text-orange-700 border-orange-200",
  New: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Qualified: "bg-green-100 text-green-700 border-green-200",
  Cold: "bg-gray-100 text-gray-600 border-gray-200",
  Lost: "bg-gray-100 text-gray-400 border-gray-200",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-blue-500", "bg-purple-500", "bg-pink-500",
  "bg-rose-500", "bg-orange-500", "bg-green-500", "bg-teal-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700">{score}</span>
    </div>
  );
}

export default function Leads() {
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => setDebouncedSearch(val), 350);
    setSearchTimer(t);
  }, [searchTimer]);

  const { data, isLoading, isFetching } = useGetLeads({
    params: {
      status: status === "All" ? undefined : status,
      search: debouncedSearch || undefined,
      limit: "100",
    },
  });

  const leads = data?.leads ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">
            {data?.total != null ? `${data.total} total` : "—"}
            {isFetching && !isLoading && <span className="ml-2 text-indigo-400">↻</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads/discover">
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Discover Leads
            </button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by company or name..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              style={{ fontSize: 16 }}
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === s
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-8"></th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Company</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Contact</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3 hidden md:table-cell">Email</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3 hidden lg:table-cell">Industry</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3 hidden sm:table-cell">Score</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="w-7 h-7 rounded-full bg-gray-100" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    <td className="px-3 py-3 hidden md:table-cell"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                    <td className="px-3 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    <td className="px-3 py-3"><div className="h-5 bg-gray-100 rounded-full w-14" /></td>
                    <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-7 bg-gray-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <p className="text-sm text-gray-400">No leads match your filter</p>
                    <Link href="/leads/discover">
                      <button className="mt-3 text-sm text-indigo-600 hover:underline">Discover new leads →</button>
                    </Link>
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-indigo-50/30 transition-colors group">
                    {/* Avatar */}
                    <td className="pl-4 py-3 pr-2">
                      <div className={`w-7 h-7 rounded-full ${avatarColor(lead.companyName)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                        {initials(lead.companyName)}
                      </div>
                    </td>

                    {/* Company + website */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{lead.companyName}</span>
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            className="text-gray-300 hover:text-indigo-500 transition-colors flex-shrink-0">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {lead.location && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">{lead.location}</p>}
                    </td>

                    {/* Contact */}
                    <td className="px-3 py-3">
                      <span className="text-sm text-gray-700 truncate max-w-[120px] block">{lead.contactName || "—"}</span>
                    </td>

                    {/* Email */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/email">
                          <Mail className="w-3 h-3 opacity-60" />
                          <span className="truncate max-w-[160px]">{lead.email}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Industry */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500 truncate max-w-[100px] block">{lead.industry || "—"}</span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {lead.status}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <ScoreBar score={lead.score} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <Link href={`/leads/${lead.id}`}>
                        <button className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md hover:bg-indigo-50">
                          View <ChevronRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
