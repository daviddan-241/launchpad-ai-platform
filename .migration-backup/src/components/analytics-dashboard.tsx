"use client";

import { useState } from "react";
import { IconTrending, IconMoney, IconUsers, IconTarget, IconZap, IconFire, IconCheck } from "@/components/icons";

type Totals = {
  totalRevenue: number; totalLeads: number; totalPaid: number;
  totalReplied: number; avgConvRate: number; avgReplyRate: number;
  avgReplyMin: number | null; pipeline: number; currency: string;
};

type CampaignStat = {
  id: string; name: string; niche: string; offer: string;
  price: number; currency: string; status: string;
  total: number; emailed: number; replied: number; offerMade: number; paid: number; revenue: number;
  replyRate: number; conversionRate: number; avgReplyMin: number | null;
  createdAt: string;
};

type NicheStat = { niche: string; leads: number; paid: number; revenue: number; conversionRate: number };
type DayStat = { date: string; amount: number };

type Props = {
  totals: Totals;
  campaignStats: CampaignStat[];
  nicheStats: NicheStat[];
  revenueTimeline: DayStat[];
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function formatMin(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}

function ProgressBar({ pct, color = "bg-fuchsia-500" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function SparkLine({ data }: { data: DayStat[] }) {
  const max = Math.max(...data.map(d => d.amount), 1);
  const w = 400; const h = 80;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.amount / max) * (h - 8);
    return `${x},${y}`;
  }).join(" ");
  const fillPts = `0,${h} ${pts} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d946ef" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#spark-fill)" />
      <polyline points={pts} fill="none" stroke="#d946ef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ items, max, colorClass }: { items: { label: string; value: number }[]; max: number; colorClass: string }) {
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-300 truncate max-w-[60%]">{item.label}</span>
            <span className="text-slate-400">{item.value}%</span>
          </div>
          <ProgressBar pct={(item.value / (max || 1)) * 100} color={colorClass} />
        </div>
      ))}
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  running: "bg-emerald-400",
  paused: "bg-amber-400",
  completed: "bg-blue-400",
  failed: "bg-rose-400",
};

export function AnalyticsDashboard({ totals, campaignStats, nicheStats, revenueTimeline }: Props) {
  const [tab, setTab] = useState<"campaigns" | "niches">("campaigns");

  const hasData = totals.totalLeads > 0;
  const recent7 = revenueTimeline.slice(-7).reduce((n, d) => n + d.amount, 0);
  const prev7 = revenueTimeline.slice(-14, -7).reduce((n, d) => n + d.amount, 0);
  const weekGrowth = prev7 > 0 ? Math.round(((recent7 - prev7) / prev7) * 100) : null;

  const topNiche = nicheStats[0]?.niche ?? "—";
  const topConv = nicheStats[0]?.conversionRate ?? 0;

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total AI revenue",
            value: fmt(totals.totalRevenue, totals.currency),
            sub: weekGrowth !== null ? `${weekGrowth >= 0 ? "+" : ""}${weekGrowth}% vs last week` : "No prior week data",
            icon: <IconMoney className="h-5 w-5" />,
            accent: "from-fuchsia-600/20 to-violet-600/10 border-fuchsia-400/20",
            iconColor: "text-fuchsia-300",
          },
          {
            label: "Pipeline value",
            value: fmt(totals.pipeline, totals.currency),
            sub: "Conversations + offers in play",
            icon: <IconTrending className="h-5 w-5" />,
            accent: "from-violet-600/20 to-blue-600/10 border-violet-400/20",
            iconColor: "text-violet-300",
          },
          {
            label: "Conversion rate",
            value: `${totals.avgConvRate}%`,
            sub: `${totals.totalPaid} paid of ${totals.totalLeads} leads`,
            icon: <IconTarget className="h-5 w-5" />,
            accent: "from-emerald-600/20 to-teal-600/10 border-emerald-400/20",
            iconColor: "text-emerald-300",
          },
          {
            label: "Avg reply time",
            value: totals.avgReplyMin !== null ? formatMin(totals.avgReplyMin) : "—",
            sub: `Reply rate ${totals.avgReplyRate}% of leads`,
            icon: <IconZap className="h-5 w-5" />,
            accent: "from-amber-600/20 to-orange-600/10 border-amber-400/20",
            iconColor: "text-amber-300",
          },
        ].map(card => (
          <div key={card.label} className={`rounded-[24px] border bg-gradient-to-br ${card.accent} p-5`}>
            <div className={`mb-3 ${card.iconColor}`}>{card.icon}</div>
            <p className="text-2xl font-bold text-white leading-none">{card.value}</p>
            <p className="mt-1.5 text-xs font-medium text-slate-300">{card.label}</p>
            <p className="mt-1 text-xs text-slate-500 leading-4">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue sparkline */}
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Revenue — last 30 days</p>
            <p className="text-xs text-slate-500 mt-0.5">Combined autonomous + manual payments</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-fuchsia-300">{fmt(recent7, totals.currency)}</p>
            <p className="text-xs text-slate-500">this week</p>
          </div>
        </div>
        {hasData ? (
          <SparkLine data={revenueTimeline} />
        ) : (
          <div className="flex h-20 items-center justify-center rounded-2xl border border-dashed border-white/10">
            <p className="text-xs text-slate-600">Revenue chart populates once payments come in</p>
          </div>
        )}
        <div className="mt-3 flex justify-between text-xs text-slate-600">
          <span>{revenueTimeline[0]?.date}</span>
          <span>{revenueTimeline[revenueTimeline.length - 1]?.date}</span>
        </div>
      </div>

      {/* Tabs: Campaigns / Niches */}
      <div className="flex gap-2">
        {(["campaigns", "niches"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition ${tab === t ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "campaigns" && (
        <div className="space-y-3">
          {campaignStats.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-white/10 px-6 py-12 text-center">
              <p className="text-slate-500 text-sm">No campaigns yet. Launch one in the Campaigns tab.</p>
            </div>
          ) : (
            campaignStats.map(c => (
              <div key={c.id} className="rounded-[24px] border border-white/8 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[c.status] ?? "bg-slate-500"}`} />
                      <p className="font-semibold text-white text-sm">{c.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{c.offer} · {c.niche}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-fuchsia-300">{fmt(c.revenue, c.currency)}</p>
                    <p className="text-xs text-slate-500">{c.paid} client{c.paid !== 1 ? "s" : ""} paid</p>
                  </div>
                </div>

                {/* Funnel bars */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
                  {[
                    { label: "Leads", value: c.total, pct: 100, color: "bg-slate-500" },
                    { label: "Replied", value: c.replied, pct: c.replyRate, color: "bg-blue-500" },
                    { label: "Offer sent", value: c.offerMade, pct: c.total > 0 ? Math.round((c.offerMade / c.total) * 100) : 0, color: "bg-violet-500" },
                    { label: "Paid", value: c.paid, pct: c.conversionRate, color: "bg-fuchsia-500" },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex items-end justify-between mb-1">
                        <span className="text-xs text-slate-400">{f.label}</span>
                        <span className="text-xs font-semibold text-white">{f.value}</span>
                      </div>
                      <ProgressBar pct={f.pct} color={f.color} />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>Reply rate <span className="text-white font-medium">{c.replyRate}%</span></span>
                  <span>Conversion <span className="text-white font-medium">{c.conversionRate}%</span></span>
                  {c.avgReplyMin !== null && (
                    <span>Avg reply time <span className="text-white font-medium">{formatMin(c.avgReplyMin)}</span></span>
                  )}
                  <span>Price <span className="text-white font-medium">{fmt(c.price, c.currency)}</span></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "niches" && (
        <div className="space-y-3">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-5">
              <IconFire className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-white">Best-converting niche</p>
                <p className="text-xs text-slate-400">{topNiche} — {topConv}% conversion</p>
              </div>
            </div>
            {nicheStats.length === 0 ? (
              <p className="text-xs text-slate-600">Data populates once campaigns run.</p>
            ) : (
              <BarChart
                items={nicheStats.map(n => ({ label: n.niche, value: n.conversionRate }))}
                max={Math.max(...nicheStats.map(n => n.conversionRate), 1)}
                colorClass="bg-fuchsia-500"
              />
            )}
          </div>

          {nicheStats.length > 0 && (
            <div className="rounded-[24px] border border-white/8 bg-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-xs text-slate-500">
                    <th className="px-5 py-3 text-left font-medium">Niche</th>
                    <th className="px-5 py-3 text-right font-medium">Leads</th>
                    <th className="px-5 py-3 text-right font-medium">Paid</th>
                    <th className="px-5 py-3 text-right font-medium">Revenue</th>
                    <th className="px-5 py-3 text-right font-medium">Conv %</th>
                  </tr>
                </thead>
                <tbody>
                  {nicheStats.map((n, i) => (
                    <tr key={n.niche} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-white flex items-center gap-2">
                        {i === 0 && <IconCheck className="h-3 w-3 text-emerald-400" />}
                        {n.niche}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400">{n.leads}</td>
                      <td className="px-5 py-3 text-right text-slate-400">{n.paid}</td>
                      <td className="px-5 py-3 text-right text-fuchsia-300 font-medium">{fmt(n.revenue, totals.currency)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${n.conversionRate >= 10 ? "bg-emerald-400/15 text-emerald-300" : n.conversionRate >= 3 ? "bg-amber-400/15 text-amber-300" : "bg-slate-400/15 text-slate-300"}`}>
                          {n.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
