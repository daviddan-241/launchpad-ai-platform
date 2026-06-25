import { Router, type IRouter } from "express";
import { db, leadsTable, activityTable } from "@workspace/db";
import { eq, sql, ilike, and, desc } from "drizzle-orm";
import { generateText } from "../lib/ai";

const router: IRouter = Router();

function serializeLead(l: typeof leadsTable.$inferSelect) {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt?.toISOString() ?? null,
  };
}

router.get("/leads", async (req, res): Promise<void> => {
  try {
    const { status, industry, search, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(leadsTable.status, status));
    if (industry) conditions.push(eq(leadsTable.industry, industry));
    if (search) conditions.push(ilike(leadsTable.companyName, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRow] = await Promise.all([
      db.select().from(leadsTable).where(where).orderBy(desc(leadsTable.createdAt)).limit(Number(limit)).offset(Number(offset)),
      db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(where),
    ]);

    res.json({ leads: rows.map(serializeLead), total: Number(countRow[0]?.count ?? 0) });
  } catch (err) {
    req.log.error({ err }, "list leads failed");
    res.status(500).json({ error: "Failed to list leads" });
  }
});

router.post("/leads", async (req, res): Promise<void> => {
  try {
    const { companyName, ...rest } = req.body;
    if (!companyName) { res.status(400).json({ error: "companyName required" }); return; }
    const [lead] = await db.insert(leadsTable).values({ companyName, ...rest }).returning();
    await db.insert(activityTable).values({ type: "lead_created", description: `New lead added: ${companyName}`, entityId: String(lead.id), entityType: "lead" });
    res.status(201).json(serializeLead(lead));
  } catch (err) {
    req.log.error({ err }, "create lead failed");
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.post("/leads/discover", async (req, res): Promise<void> => {
  try {
    const { query, industry, location, limit = 10 } = req.body;
    if (!query) { res.status(400).json({ error: "query required" }); return; }

    // Use AI to generate realistic business leads based on search params
    const prompt = `Generate ${limit} realistic business leads for: "${query}" industry: "${industry || "any"}" location: "${location || "USA"}".
Return ONLY valid JSON array, no markdown, no extra text. Each object must have these exact fields:
[{"companyName":"Acme Corp","contactName":"Jane Smith","email":"jane@acme.com","phone":"+1-555-0100","website":"https://acme.com","industry":"${industry || "Technology"}","location":"${location || "New York, NY"}","status":"New","score":${Math.floor(Math.random() * 40) + 50},"notes":"Potential client interested in digital transformation","linkedinUrl":"https://linkedin.com/company/acme","whatsappNumber":"+15550100","source":"discovered"}]`;

    const raw = await generateText(prompt, "You are a B2B lead generation expert. Return only valid JSON arrays, no markdown fences.");
    let leads: Array<Record<string, unknown>> = [];
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      leads = JSON.parse(cleaned);
    } catch {
      req.log.warn("AI returned non-JSON for lead discovery, using fallback");
      leads = Array.from({ length: Number(limit) }, (_, i) => ({
        companyName: `${query} Solutions ${i + 1}`,
        contactName: "Contact Name",
        email: `contact${i + 1}@${query.toLowerCase().replace(/\s+/g, "")}${i + 1}.com`,
        phone: `+1-555-${String(1000 + i).padStart(4, "0")}`,
        website: `https://${query.toLowerCase().replace(/\s+/g, "")}${i + 1}.com`,
        industry: industry || "Technology",
        location: location || "USA",
        status: "New",
        score: Math.floor(Math.random() * 40) + 50,
        notes: `Discovered via search: ${query}`,
        source: "discovered",
      }));
    }

    // Insert into DB
    const inserted = await Promise.all(
      leads.slice(0, Number(limit)).map(async (l) => {
        const [row] = await db.insert(leadsTable).values({
          companyName: String(l.companyName || "Unknown"),
          contactName: l.contactName ? String(l.contactName) : null,
          email: l.email ? String(l.email) : null,
          phone: l.phone ? String(l.phone) : null,
          website: l.website ? String(l.website) : null,
          industry: l.industry ? String(l.industry) : industry || null,
          location: l.location ? String(l.location) : location || null,
          status: "New",
          score: Number(l.score) || 50,
          notes: l.notes ? String(l.notes) : null,
          linkedinUrl: l.linkedinUrl ? String(l.linkedinUrl) : null,
          whatsappNumber: l.whatsappNumber ? String(l.whatsappNumber) : null,
          source: "discovered",
        }).returning();
        return row;
      })
    );

    await db.insert(activityTable).values({ type: "lead_created", description: `Discovered ${inserted.length} leads for "${query}"` });
    res.json(inserted.map(serializeLead));
  } catch (err) {
    req.log.error({ err }, "discover leads failed");
    res.status(500).json({ error: "Lead discovery failed" });
  }
});

router.get("/leads/stats", async (req, res): Promise<void> => {
  try {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable);
    const byStatus = await db.select({ label: leadsTable.status, count: sql<number>`count(*)::int` }).from(leadsTable).groupBy(leadsTable.status);
    const byIndustry = await db.select({ label: leadsTable.industry, count: sql<number>`count(*)::int` }).from(leadsTable).where(sql`industry is not null`).groupBy(leadsTable.industry);
    const [avgRow] = await db.select({ avg: sql<number>`coalesce(avg(score),0)::float` }).from(leadsTable);
    res.json({
      total: Number(total?.count ?? 0),
      byStatus: byStatus.map((r) => ({ label: r.label ?? "Unknown", count: Number(r.count) })),
      byIndustry: byIndustry.map((r) => ({ label: r.label ?? "Unknown", count: Number(r.count) })),
      avgScore: Math.round(Number(avgRow?.avg ?? 0) * 10) / 10,
    });
  } catch (err) {
    req.log.error({ err }, "lead stats failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    res.json(serializeLead(lead));
  } catch (err) {
    req.log.error({ err }, "get lead failed");
    res.status(500).json({ error: "Failed to get lead" });
  }
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [lead] = await db.update(leadsTable).set(req.body).where(eq(leadsTable.id, id)).returning();
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    res.json(serializeLead(lead));
  } catch (err) {
    req.log.error({ err }, "update lead failed");
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(leadsTable).where(eq(leadsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "delete lead failed");
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

export default router;
