import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Users, Flame, Send, MailOpen, Zap, TrendingUp, ArrowRight, Clock } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-3 bg-gray-100 rounded w-24 mb-3" />
      <div className="h-7 bg-gray-100 rounded w-16" />
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  Hot: "bg-red-500",
  Warm: "bg-orange-400",
  New: "bg-indigo-500",
  Cold: "bg-gray-400",
  Qualified: "bg-green-500",
  Lost: "bg-gray-300",
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: activity, isLoading: actLoading } = useGetRecentActivity();

  const totalLeadsByStatus = stats?.leadsByStatus?.reduce((a: number, b: { count: number }) => a + b.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your sales pipeline at a glance</p>
        </div>
        <Link href="/leads/discover">
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Zap className="w-4 h-4" /> Discover Leads
          </button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Leads" value={stats?.totalLeads ?? 0} icon={Users} color="bg-indigo-500" />
            <StatCard label="Hot & Warm" value={stats?.hotLeads ?? 0} sub="Active pipeline" icon={Flame} color="bg-orange-500" />
            <StatCard label="Campaigns" value={stats?.campaignsSent ?? 0} icon={Send} color="bg-blue-500" />
            <StatCard label="Open Rate" value={`${stats?.openRate ?? 0}%`} icon={MailOpen} color="bg-green-500" />
            <StatCard label="Projects" value={stats?.projectsGenerated ?? 0} icon={Zap} color="bg-yellow-500" />
            <StatCard label="Revenue Est." value={`$${((stats?.revenueEstimate ?? 0) / 1000).toFixed(0)}k`} icon={TrendingUp} color="bg-purple-500" />
          </>
        )}
      </div>

      {/* Pipeline + Activity */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Pipeline breakdown */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Lead Pipeline</h2>
            <Link href="/leads">
              <span className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer">
                View all <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded" />
              ))}
            </div>
          ) : stats?.leadsByStatus?.length ? (
            <div className="space-y-3">
              {stats.leadsByStatus
                .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
                .map((row: { label: string; count: number }) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{row.label}</span>
                      <span className="text-gray-400">{row.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STAGE_COLORS[row.label] ?? "bg-gray-400"}`}
                        style={{ width: `${Math.round((row.count / totalLeadsByStatus) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No leads yet</p>
              <Link href="/leads/discover">
                <button className="mt-3 text-xs text-indigo-600 hover:underline">Discover your first leads →</button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          {actLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity?.length ? (
            <div className="space-y-3 overflow-y-auto max-h-72">
              {activity.map((item: { id: number; type: string; description: string; createdAt: string }) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 leading-relaxed">{item.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No activity yet — start by adding leads</p>
            </div>
          )}
        </div>
      </div>

      {/* Industry breakdown */}
      {stats?.leadsByIndustry?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Leads by Industry</h2>
          <div className="flex flex-wrap gap-2">
            {stats.leadsByIndustry.map((row: { label: string; count: number }) => (
              <div key={row.label} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
                <span className="text-xs font-medium text-gray-700">{row.label}</span>
                <span className="text-xs text-gray-400">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
