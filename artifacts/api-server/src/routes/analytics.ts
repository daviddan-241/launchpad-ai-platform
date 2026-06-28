import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, campaignsTable, chatSessionsTable, activityTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalLeads] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.userId, uid));
    const [leadsThisWeek] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(and(eq(leadsTable.userId, uid), gte(leadsTable.createdAt, weekAgo)));
    const campaigns = await db.select().from(campaignsTable).where(eq(campaignsTable.userId, uid));
    const [chatCount] = await db.select({ count: sql<number>`count(*)` }).from(chatSessionsTable).where(eq(chatSessionsTable.userId, uid));

    const sentCampaigns = campaigns.filter(c => c.status === "sent");
    const totalEmailsSent = sentCampaigns.reduce((s, c) => s + c.sentCount, 0);
    const totalOpens = sentCampaigns.reduce((s, c) => s + c.openCount, 0);
    const totalReplies = sentCampaigns.reduce((s, c) => s + c.replyCount, 0);

    // Top countries from leads
    const countryRows = await db.select({
      country: leadsTable.country,
      count: sql<number>`count(*)`,
    }).from(leadsTable).where(eq(leadsTable.userId, uid)).groupBy(leadsTable.country);

    const topCountries = countryRows
      .filter(r => r.country)
      .map(r => ({ country: r.country!, count: Number(r.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentActivity = await db.select().from(activityTable)
      .where(eq(activityTable.userId, uid))
      .orderBy(sql`${activityTable.createdAt} desc`)
      .limit(10);

    res.json({
      totalLeads: Number(totalLeads.count),
      leadsThisWeek: Number(leadsThisWeek.count),
      campaignsSent: sentCampaigns.length,
      emailsSent: totalEmailsSent,
      openRate: totalEmailsSent > 0 ? Math.round((totalOpens / totalEmailsSent) * 100) : 0,
      replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0,
      topCountries,
      recentActivity: recentActivity.map(a => ({ id: a.id, type: a.type, description: a.description, createdAt: a.createdAt.toISOString() })),
      chatSessions: Number(chatCount.count),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/leads", async (req: AuthRequest, res) => {
  try {
    const uid = req.userId!;

    const byStatus = await db.select({
      status: leadsTable.status,
      count: sql<number>`count(*)`,
    }).from(leadsTable).where(eq(leadsTable.userId, uid)).groupBy(leadsTable.status);

    const byCountry = await db.select({
      country: leadsTable.country,
      count: sql<number>`count(*)`,
    }).from(leadsTable).where(eq(leadsTable.userId, uid)).groupBy(leadsTable.country);

    const byIndustry = await db.select({
      industry: leadsTable.industry,
      count: sql<number>`count(*)`,
    }).from(leadsTable).where(eq(leadsTable.userId, uid)).groupBy(leadsTable.industry);

    // Score distribution
    const leads = await db.select({ score: leadsTable.score }).from(leadsTable).where(eq(leadsTable.userId, uid));
    const buckets = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 };
    for (const l of leads) {
      const score = l.score || 0;
      if (score <= 25) buckets["0-25"]++;
      else if (score <= 50) buckets["26-50"]++;
      else if (score <= 75) buckets["51-75"]++;
      else buckets["76-100"]++;
    }

    res.json({
      byStatus: byStatus.map(r => ({ status: r.status, count: Number(r.count) })),
      byCountry: byCountry.filter(r => r.country).map(r => ({ country: r.country!, count: Number(r.count) })).sort((a, b) => b.count - a.count),
      byIndustry: byIndustry.filter(r => r.industry).map(r => ({ industry: r.industry!, count: Number(r.count) })).sort((a, b) => b.count - a.count),
      scoreDistribution: Object.entries(buckets).map(([range, count]) => ({ range, count })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
