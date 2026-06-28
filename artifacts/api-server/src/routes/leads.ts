import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, activityTable, settingsTable } from "@workspace/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";

const router = Router();
router.use(requireAuth);

function serializeLead(lead: typeof leadsTable.$inferSelect) {
  return {
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { status, country, search } = req.query as Record<string, string>;
    let query = db.select().from(leadsTable).where(eq(leadsTable.userId, req.userId!));

    const conditions = [eq(leadsTable.userId, req.userId!)];
    if (status) conditions.push(eq(leadsTable.status, status));
    if (country) conditions.push(eq(leadsTable.country, country));
    if (search) {
      conditions.push(
        or(
          ilike(leadsTable.name, `%${search}%`),
          ilike(leadsTable.email, `%${search}%`),
          ilike(leadsTable.company, `%${search}%`),
          ilike(leadsTable.title, `%${search}%`)
        )!
      );
    }

    const leads = await db.select().from(leadsTable).where(and(...conditions)).orderBy(sql`${leadsTable.createdAt} desc`);
    res.json(leads.map(serializeLead));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const [lead] = await db.insert(leadsTable).values({
      userId: req.userId!,
      name: String(body.name || ""),
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      company: body.company ? String(body.company) : null,
      title: body.title ? String(body.title) : null,
      website: body.website ? String(body.website) : null,
      country: body.country ? String(body.country) : null,
      city: body.city ? String(body.city) : null,
      industry: body.industry ? String(body.industry) : null,
      status: String(body.status || "new"),
      score: body.score ? Number(body.score) : null,
      notes: body.notes ? String(body.notes) : null,
      linkedinUrl: body.linkedinUrl ? String(body.linkedinUrl) : null,
      source: body.source ? String(body.source) : null,
    }).returning();

    await db.insert(activityTable).values({
      userId: req.userId!,
      type: "lead",
      description: `New lead added: ${lead.name}${lead.company ? ` at ${lead.company}` : ""}`,
    });

    res.status(201).json(serializeLead(lead));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Search/find leads globally using available APIs
router.post("/search", async (req: AuthRequest, res) => {
  try {
    const { query, industry, country, title, companySize, limit = 10 } = req.body as Record<string, string | number>;

    // Get user settings for API keys
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);

    const candidates: Array<{
      name: string;
      email: string | null;
      company: string | null;
      title: string | null;
      website: string | null;
      country: string | null;
      industry: string | null;
      linkedinUrl: string | null;
      confidence: number;
    }> = [];

    // Try Hunter.io domain search if API key is set
    if (settings?.hunterApiKey && industry) {
      try {
        const hunterQuery = encodeURIComponent(String(query));
        const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${hunterQuery}&api_key=${settings.hunterApiKey}&limit=${limit}`;
        const hunterRes = await fetch(hunterUrl);
        if (hunterRes.ok) {
          const data = await hunterRes.json() as { data?: { emails?: Array<{ value: string; first_name: string; last_name: string; position: string; linkedin: string; confidence: number }>, organization?: string, domain?: string } };
          if (data?.data?.emails) {
            for (const email of data.data.emails) {
              candidates.push({
                name: `${email.first_name || ""} ${email.last_name || ""}`.trim() || "Unknown",
                email: email.value || null,
                company: data.data.organization || null,
                title: email.position || null,
                website: data.data.domain ? `https://${data.data.domain}` : null,
                country: country ? String(country) : null,
                industry: industry ? String(industry) : null,
                linkedinUrl: email.linkedin || null,
                confidence: email.confidence || 70,
              });
            }
          }
        }
      } catch (e) { /* ignore hunter errors */ }
    }

    // Try Apollo.io if API key is set
    if (settings?.apolloApiKey && candidates.length < Number(limit)) {
      try {
        const apolloBody: Record<string, unknown> = {
          q_keywords: String(query),
          page: 1,
          per_page: Number(limit),
        };
        if (industry) apolloBody.industry_tag_names = [String(industry)];
        if (country) apolloBody.organization_locations = [String(country)];
        if (title) apolloBody.person_titles = [String(title)];

        const apolloRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": settings.apolloApiKey,
          },
          body: JSON.stringify(apolloBody),
        });

        if (apolloRes.ok) {
          const data = await apolloRes.json() as { people?: Array<{ name: string; email: string; title: string; organization_name: string; website_url: string; country: string; linkedin_url: string }> };
          if (data?.people) {
            for (const person of data.people) {
              candidates.push({
                name: person.name || "Unknown",
                email: person.email || null,
                company: person.organization_name || null,
                title: person.title || null,
                website: person.website_url || null,
                country: person.country || (country ? String(country) : null),
                industry: industry ? String(industry) : null,
                linkedinUrl: person.linkedin_url || null,
                confidence: 85,
              });
            }
          }
        }
      } catch (e) { /* ignore apollo errors */ }
    }

    // Google Custom Search fallback
    if (candidates.length === 0 && settings?.googleSearchApiKey && settings?.googleSearchCx) {
      try {
        const searchQuery = encodeURIComponent(`${String(query)} ${title ? String(title) : ""} ${industry ? String(industry) : ""} ${country ? String(country) : ""} email contact`);
        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${settings.googleSearchApiKey}&cx=${settings.googleSearchCx}&q=${searchQuery}&num=10`;
        const googleRes = await fetch(googleUrl);
        if (googleRes.ok) {
          const data = await googleRes.json() as { items?: Array<{ title: string; snippet: string; link: string; pagemap?: { person?: Array<{ name?: string; email?: string; jobtitle?: string }> } }> };
          if (data?.items) {
            for (const item of data.items.slice(0, Number(limit))) {
              const person = item.pagemap?.person?.[0];
              candidates.push({
                name: person?.name || item.title.split(" - ")[0] || "Unknown",
                email: person?.email || null,
                company: item.title.split(" - ")[1] || null,
                title: person?.jobtitle || (title ? String(title) : null),
                website: item.link || null,
                country: country ? String(country) : null,
                industry: industry ? String(industry) : null,
                linkedinUrl: item.link?.includes("linkedin.com") ? item.link : null,
                confidence: 50,
              });
            }
          }
        }
      } catch (e) { /* ignore google errors */ }
    }

    // If no API keys configured, return demo data based on search criteria
    if (candidates.length === 0) {
      const countries: Record<string, string[]> = {
        usa: ["New York", "San Francisco", "Chicago", "Austin", "Boston"],
        canada: ["Toronto", "Vancouver", "Montreal", "Calgary"],
        uk: ["London", "Manchester", "Edinburgh"],
        australia: ["Sydney", "Melbourne", "Brisbane"],
        germany: ["Berlin", "Munich", "Hamburg"],
        china: ["Beijing", "Shanghai", "Shenzhen"],
        india: ["Mumbai", "Bangalore", "Delhi"],
        singapore: ["Singapore"],
        uae: ["Dubai", "Abu Dhabi"],
        brazil: ["São Paulo", "Rio de Janeiro"],
      };

      const countryKey = (country || "usa").toLowerCase();
      const cities = countries[countryKey] || countries.usa;
      const industries = ["SaaS", "FinTech", "E-commerce", "Healthcare", "Marketing", "Consulting", "Real Estate"];
      const titles = ["CEO", "VP Sales", "Head of Marketing", "Director of Operations", "CTO", "Founder", "Sales Manager"];
      const firstNames = ["Sarah", "Michael", "Emma", "James", "Olivia", "David", "Sophie", "Daniel", "Alex", "Lisa"];
      const lastNames = ["Chen", "Williams", "Johnson", "Smith", "Brown", "Taylor", "Davis", "Wilson", "Moore", "Anderson"];
      const companies = ["Acme Corp", "TechVision", "NovaSales", "GrowthLabs", "CloudBase", "DataPeak", "ScaleUp", "NextGen Solutions"];

      for (let i = 0; i < Math.min(Number(limit), 10); i++) {
        const fn = firstNames[i % firstNames.length];
        const ln = lastNames[i % lastNames.length];
        const company = companies[i % companies.length];
        candidates.push({
          name: `${fn} ${ln}`,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, "")}.com`,
          company,
          title: title ? String(title) : titles[i % titles.length],
          website: `https://www.${company.toLowerCase().replace(/\s+/g, "")}.com`,
          country: country ? String(country) : "USA",
          industry: industry ? String(industry) : industries[i % industries.length],
          linkedinUrl: `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}`,
          confidence: 60 + (i % 30),
        });
      }
    }

    res.json({
      leads: candidates.slice(0, Number(limit)),
      total: candidates.length,
      source: settings?.hunterApiKey || settings?.apolloApiKey ? "live_api" : "demo",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/import", async (req: AuthRequest, res) => {
  try {
    const { leads } = req.body as { leads: Array<Record<string, unknown>> };
    let imported = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      try {
        await db.insert(leadsTable).values({
          userId: req.userId!,
          name: String(lead.name || "Unknown"),
          email: lead.email ? String(lead.email) : null,
          phone: lead.phone ? String(lead.phone) : null,
          company: lead.company ? String(lead.company) : null,
          title: lead.title ? String(lead.title) : null,
          website: lead.website ? String(lead.website) : null,
          country: lead.country ? String(lead.country) : null,
          city: lead.city ? String(lead.city) : null,
          industry: lead.industry ? String(lead.industry) : null,
          status: String(lead.status || "new"),
          score: lead.score ? Number(lead.score) : null,
          notes: lead.notes ? String(lead.notes) : null,
          linkedinUrl: lead.linkedinUrl ? String(lead.linkedinUrl) : null,
          source: lead.source ? String(lead.source) : "import",
        });
        imported++;
      } catch (e) {
        errors.push(`Failed to import lead: ${lead.name}`);
      }
    }

    if (imported > 0) {
      await db.insert(activityTable).values({
        userId: req.userId!,
        type: "lead",
        description: `Imported ${imported} leads`,
      });
    }

    res.json({ imported, skipped: 0, errors });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.userId, req.userId!))).limit(1);
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }
    res.json(serializeLead(lead));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ["name", "email", "phone", "company", "title", "website", "country", "city", "industry", "status", "score", "notes", "linkedinUrl", "source"];
    for (const f of fields) {
      if (body[f] !== undefined) update[f === "linkedinUrl" ? "linkedinUrl" : f] = body[f] || null;
    }

    const [lead] = await db.update(leadsTable).set(update).where(and(eq(leadsTable.id, id), eq(leadsTable.userId, req.userId!))).returning();
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }
    res.json(serializeLead(lead));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.userId, req.userId!)));
    res.json({ success: true, message: "Lead deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
