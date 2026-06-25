import { Router, type IRouter } from "express";
import { db, leadsTable, campaignsTable, projectsTable, activityTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  try {
    const [totalLeadsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable);
    const [hotLeadsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(sql`status IN ('Hot','Warm')`);
    const [campaignRow] = await db.select({ count: sql<number>`count(*)::int`, sent: sql<number>`coalesce(sum(sent_count),0)::int`, opened: sql<number>`coalesce(sum(open_count),0)::int` }).from(campaignsTable);
    const [projectRow] = await db.select({ count: sql<number>`count(*)::int` }).from(projectsTable);

    const totalSent = Number(campaignRow?.sent ?? 0);
    const totalOpened = Number(campaignRow?.opened ?? 0);
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100 * 10) / 10 : 0;

    const byStatus = await db
      .select({ label: leadsTable.status, count: sql<number>`count(*)::int` })
      .from(leadsTable)
      .groupBy(leadsTable.status);

    const byIndustry = await db
      .select({ label: leadsTable.industry, count: sql<number>`count(*)::int` })
      .from(leadsTable)
      .where(sql`industry is not null`)
      .groupBy(leadsTable.industry)
      .limit(8);

    res.json({
      totalLeads: Number(totalLeadsRow?.count ?? 0),
      hotLeads: Number(hotLeadsRow?.count ?? 0),
      campaignsSent: Number(campaignRow?.count ?? 0),
      openRate,
      projectsGenerated: Number(projectRow?.count ?? 0),
      revenueEstimate: Number(projectRow?.count ?? 0) * 2500,
      leadsByStatus: byStatus.map((r) => ({ label: r.label ?? "Unknown", count: Number(r.count) })),
      leadsByIndustry: byIndustry.map((r) => ({ label: r.label ?? "Unknown", count: Number(r.count) })),
    });
  } catch (err) {
    req.log.error({ err }, "dashboard stats failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(20);
    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "activity failed");
    res.status(500).json({ error: "Failed to load activity" });
  }
});

export default router;
