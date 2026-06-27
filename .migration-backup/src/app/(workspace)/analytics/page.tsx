import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function msToMinutes(ms: number) { return Math.round(ms / 60000); }

export default async function AnalyticsPage() {
  const user = await requireCurrentUser();
  const store = await readStore();

  const campaigns = (store.autonomousCampaigns ?? []).filter(c => c.userId === user.id);
  const payments = store.paymentRequests.filter(p => p.userId === user.id && p.status === "paid");

  // ── Per-campaign stats ───────────────────────────────────────────────────────
  const campaignStats = campaigns.map(c => {
    const total = c.steps.length;
    const emailed = c.steps.filter(s => s.status !== "pending").length;
    const replied = c.steps.filter(s => (s.conversationHistory ?? []).some(m => m.role === "user")).length;
    const offerMade = c.steps.filter(s => ["offer_made","payment_requested","paid"].includes(s.conversationState ?? "")).length;
    const paid = c.steps.filter(s => s.status === "paid" || s.conversationState === "paid").length;
    const revenue = paid * c.price;

    // Average reply time: first assistant msg → first user reply
    let totalReplyMs = 0; let replyCount = 0;
    for (const s of c.steps) {
      const hist = s.conversationHistory ?? [];
      const firstOut = hist.find(m => m.role === "assistant");
      const firstIn = hist.find(m => m.role === "user");
      if (firstOut && firstIn) {
        const diff = new Date(firstIn.sentAt).getTime() - new Date(firstOut.sentAt).getTime();
        if (diff > 0) { totalReplyMs += diff; replyCount++; }
      }
    }
    const avgReplyMin = replyCount > 0 ? msToMinutes(totalReplyMs / replyCount) : null;

    return {
      id: c.id, name: c.name, niche: c.niche, offer: c.offer,
      price: c.price, currency: c.currency, status: c.status,
      total, emailed, replied, offerMade, paid, revenue,
      replyRate: total > 0 ? Math.round((replied / total) * 100) : 0,
      conversionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
      avgReplyMin,
      createdAt: c.createdAt,
    };
  });

  // ── Niche breakdown ──────────────────────────────────────────────────────────
  const nicheMap: Record<string, { leads: number; paid: number; revenue: number }> = {};
  for (const c of campaignStats) {
    if (!nicheMap[c.niche]) nicheMap[c.niche] = { leads: 0, paid: 0, revenue: 0 };
    nicheMap[c.niche].leads += c.total;
    nicheMap[c.niche].paid += c.paid;
    nicheMap[c.niche].revenue += c.revenue;
  }
  const nicheStats = Object.entries(nicheMap)
    .map(([niche, v]) => ({
      niche, ...v,
      conversionRate: v.leads > 0 ? Math.round((v.paid / v.leads) * 100) : 0,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);

  // ── Revenue by day (last 30 days) ────────────────────────────────────────────
  const now = Date.now();
  const dayMs = 86400000;
  const revByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    revByDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const p of payments) {
    const day = (p.paidAt ?? p.updatedAt ?? "").slice(0, 10);
    if (revByDay[day] !== undefined) revByDay[day] += p.amount;
  }
  // also count autonomous paid steps
  for (const c of campaigns) {
    for (const s of c.steps) {
      if (s.status === "paid" && s.lastActionAt) {
        const day = s.lastActionAt.slice(0, 10);
        if (revByDay[day] !== undefined) revByDay[day] += c.price;
      }
    }
  }
  const revenueTimeline = Object.entries(revByDay).map(([date, amount]) => ({ date, amount }));

  // ── Top-line totals ──────────────────────────────────────────────────────────
  const totalRevenue = campaignStats.reduce((n, c) => n + c.revenue, 0) +
    payments.reduce((n, p) => n + p.amount, 0);
  const totalLeads = campaignStats.reduce((n, c) => n + c.total, 0);
  const totalPaid = campaignStats.reduce((n, c) => n + c.paid, 0);
  const totalReplied = campaignStats.reduce((n, c) => n + c.replied, 0);

  const avgConvRate = totalLeads > 0 ? Math.round((totalPaid / totalLeads) * 100) : 0;
  const avgReplyRate = totalLeads > 0 ? Math.round((totalReplied / totalLeads) * 100) : 0;

  const allReplyMins = campaignStats.flatMap(c => c.avgReplyMin !== null ? [c.avgReplyMin] : []);
  const avgReplyMin = allReplyMins.length > 0
    ? Math.round(allReplyMins.reduce((a, b) => a + b, 0) / allReplyMins.length)
    : null;

  const pipeline = campaigns.reduce((n, c) => n +
    c.steps.filter(s => ["offer_made","payment_requested","in_conversation"].includes(s.conversationState ?? "")).length * c.price, 0);

  const currency = campaigns[0]?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Revenue & performance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Real-time breakdown of what the AI has earned, which campaigns convert best, and where your pipeline stands.
        </p>
      </section>

      <AnalyticsDashboard
        totals={{ totalRevenue, totalLeads, totalPaid, totalReplied, avgConvRate, avgReplyRate, avgReplyMin, pipeline, currency }}
        campaignStats={campaignStats}
        nicheStats={nicheStats}
        revenueTimeline={revenueTimeline}
      />
    </div>
  );
}
