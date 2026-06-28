import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, activityTable, settingsTable } from "@workspace/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/middleware.js";
import { calculateLeadScore } from "../lib/scoring.js";

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
    const leads = await db.select().from(leadsTable).where(and(...conditions)).orderBy(sql`${leadsTable.score} desc nulls last, ${leadsTable.createdAt} desc`);
    res.json(leads.map(serializeLead));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const leadData = {
      name: String(body.name || ""),
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      company: body.company ? String(body.company) : null,
      title: body.title ? String(body.title) : null,
      website: body.website ? String(body.website) : null,
      country: body.country ? String(body.country) : null,
      city: body.city ? String(body.city) : null,
      industry: body.industry ? String(body.industry) : null,
      linkedinUrl: body.linkedinUrl ? String(body.linkedinUrl) : null,
      source: body.source ? String(body.source) : null,
    };
    const score = body.score ? Number(body.score) : calculateLeadScore(leadData);
    const [lead] = await db.insert(leadsTable).values({
      userId: req.userId!,
      ...leadData,
      status: String(body.status || "new"),
      score,
      notes: body.notes ? String(body.notes) : null,
    }).returning();

    await db.insert(activityTable).values({
      userId: req.userId!,
      type: "lead",
      description: `New lead added: ${lead.name}${lead.company ? ` at ${lead.company}` : ""} (score: ${score})`,
    });

    res.status(201).json(serializeLead(lead));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/search", async (req: AuthRequest, res) => {
  try {
    const { query, industry, country, title, limit = 10 } = req.body as Record<string, string | number>;
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);

    const candidates: Array<{
      name: string; email: string | null; company: string | null; title: string | null;
      website: string | null; country: string | null; industry: string | null;
      linkedinUrl: string | null; confidence: number;
    }> = [];

    if (settings?.hunterApiKey) {
      try {
        const domain = String(query).includes(".") ? String(query) : `${String(query).toLowerCase().replace(/\s+/g, "")}.com`;
        const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${settings.hunterApiKey}&limit=${limit}`;
        const hunterRes = await fetch(hunterUrl);
        if (hunterRes.ok) {
          const data = await hunterRes.json() as { data?: { emails?: Array<{ value: string; first_name: string; last_name: string; position: string; linkedin: string; confidence: number }>, organization?: string, domain?: string } };
          if (data?.data?.emails?.length) {
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
      } catch { /* ignore */ }
    }

    if (settings?.apolloApiKey && candidates.length < Number(limit)) {
      try {
        const apolloBody: Record<string, unknown> = { q_keywords: String(query), page: 1, per_page: Number(limit) };
        if (industry) apolloBody.industry_tag_names = [String(industry)];
        if (country) apolloBody.organization_locations = [String(country)];
        if (title) apolloBody.person_titles = [String(title)];

        const apolloRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": settings.apolloApiKey },
          body: JSON.stringify(apolloBody),
        });

        if (apolloRes.ok) {
          const data = await apolloRes.json() as { people?: Array<{ name: string; email: string; title: string; organization_name: string; website_url: string; country: string; linkedin_url: string }> };
          if (data?.people) {
            for (const person of data.people) {
              if (!candidates.find(c => c.email === person.email)) {
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
        }
      } catch { /* ignore */ }
    }

    if (candidates.length === 0 && settings?.googleSearchApiKey && settings?.googleSearchCx) {
      try {
        const q = encodeURIComponent(`${query} ${title || ""} ${industry || ""} ${country || ""} email contact`);
        const googleRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${settings.googleSearchApiKey}&cx=${settings.googleSearchCx}&q=${q}&num=10`);
        if (googleRes.ok) {
          const data = await googleRes.json() as { items?: Array<{ title: string; link: string; pagemap?: { person?: Array<{ name?: string; email?: string; jobtitle?: string }> } }> };
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
      } catch { /* ignore */ }
    }

    if (candidates.length === 0) {
      const countryCities: Record<string, string[]> = {
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
      const cities = countryCities[countryKey] || countryCities.usa;
      const industries = ["SaaS", "FinTech", "E-commerce", "Healthcare", "Marketing", "Consulting"];
      const titles = ["CEO", "VP Sales", "Head of Marketing", "Director of Operations", "CTO", "Founder"];
      const firstNames = ["Sarah", "Michael", "Emma", "James", "Olivia", "David", "Sophie", "Daniel", "Alex", "Lisa"];
      const lastNames = ["Chen", "Williams", "Johnson", "Smith", "Brown", "Taylor", "Davis", "Wilson", "Moore", "Anderson"];
      const companies = ["Acme Corp", "TechVision", "NovaSales", "GrowthLabs", "CloudBase", "DataPeak", "ScaleUp", "NextGen"];

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

    const scored = candidates.slice(0, Number(limit)).map(c => ({
      ...c,
      score: calculateLeadScore(c),
    }));

    res.json({
      leads: scored,
      total: scored.length,
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
        const leadData = {
          name: String(lead.name || "Unknown"),
          email: lead.email ? String(lead.email) : null,
          phone: lead.phone ? String(lead.phone) : null,
          company: lead.company ? String(lead.company) : null,
          title: lead.title ? String(lead.title) : null,
          website: lead.website ? String(lead.website) : null,
          country: lead.country ? String(lead.country) : null,
          industry: lead.industry ? String(lead.industry) : null,
          linkedinUrl: lead.linkedinUrl ? String(lead.linkedinUrl) : null,
        };
        const score = lead.score ? Number(lead.score) : calculateLeadScore({ ...leadData, confidence: lead.confidence ? Number(lead.confidence) : undefined });
        await db.insert(leadsTable).values({
          userId: req.userId!,
          ...leadData,
          city: lead.city ? String(lead.city) : null,
          status: String(lead.status || "new"),
          score,
          notes: lead.notes ? String(lead.notes) : null,
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
        description: `Imported ${imported} leads with auto-scoring`,
      });
    }

    res.json({ imported, skipped: 0, errors });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/enrich", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.userId, req.userId!))).limit(1);
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }

    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, req.userId!)).limit(1);
    const updates: Record<string, unknown> = {};

    if (settings?.hunterApiKey && lead.email) {
      try {
        const domain = lead.email.split("@")[1];
        const hunterUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(lead.email)}&api_key=${settings.hunterApiKey}`;
        const verifyRes = await fetch(hunterUrl);
        if (verifyRes.ok) {
          const data = await verifyRes.json() as { data?: { result?: string; score?: number; regexp?: boolean; gibberish?: boolean; disposable?: boolean } };
          if (data?.data?.result === "deliverable" || data?.data?.score && data.data.score > 50) {
            updates.source = lead.source || "hunter_verified";
          }
        }

        if (domain) {
          const domainUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${settings.hunterApiKey}&limit=1`;
          const domainRes = await fetch(domainUrl);
          if (domainRes.ok) {
            const ddata = await domainRes.json() as { data?: { organization?: string; domain?: string; country?: string; linkedin?: string } };
            if (ddata?.data) {
              if (ddata.data.organization && !lead.company) updates.company = ddata.data.organization;
              if (ddata.data.domain && !lead.website) updates.website = `https://${ddata.data.domain}`;
              if (ddata.data.country && !lead.country) updates.country = ddata.data.country;
              if (ddata.data.linkedin && !lead.linkedinUrl) updates.linkedinUrl = ddata.data.linkedin;
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (settings?.apolloApiKey && (lead.name || lead.email)) {
      try {
        const apolloBody: Record<string, unknown> = { q_keywords: lead.name || "", page: 1, per_page: 1 };
        if (lead.company) apolloBody.organization_names = [lead.company];

        const apolloRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": settings.apolloApiKey },
          body: JSON.stringify(apolloBody),
        });

        if (apolloRes.ok) {
          const data = await apolloRes.json() as { people?: Array<{ title?: string; organization_name?: string; website_url?: string; country?: string; linkedin_url?: string; phone_numbers?: Array<{ raw_number?: string }> }> };
          const person = data?.people?.[0];
          if (person) {
            if (person.title && !lead.title) updates.title = person.title;
            if (person.organization_name && !lead.company) updates.company = person.organization_name;
            if (person.website_url && !lead.website) updates.website = person.website_url;
            if (person.country && !lead.country) updates.country = person.country;
            if (person.linkedin_url && !lead.linkedinUrl) updates.linkedinUrl = person.linkedin_url;
            if (person.phone_numbers?.[0]?.raw_number && !lead.phone) updates.phone = person.phone_numbers[0].raw_number;
          }
        }
      } catch { /* ignore */ }
    }

    const merged = { ...lead, ...updates };
    updates.score = calculateLeadScore(merged);
    updates.updatedAt = new Date();

    const [updated] = await db.update(leadsTable).set(updates).where(and(eq(leadsTable.id, id), eq(leadsTable.userId, req.userId!))).returning();

    await db.insert(activityTable).values({
      userId: req.userId!,
      type: "lead",
      description: `Lead enriched: ${lead.name} — score updated to ${updates.score}`,
    });

    res.json({ ...serializeLead(updated), enriched: Object.keys(updates).filter(k => k !== "updatedAt" && k !== "score").length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/score-all", async (req: AuthRequest, res) => {
  try {
    const leads = await db.select().from(leadsTable).where(eq(leadsTable.userId, req.userId!));
    let updated = 0;
    for (const lead of leads) {
      const score = calculateLeadScore(lead);
      if (score !== lead.score) {
        await db.update(leadsTable).set({ score, updatedAt: new Date() }).where(eq(leadsTable.id, lead.id));
        updated++;
      }
    }
    res.json({ updated, total: leads.length });
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
      if (body[f] !== undefined) update[f] = body[f] || null;
    }

    const [existing] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.userId, req.userId!))).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    if (!body.score) {
      update.score = calculateLeadScore({ ...existing, ...update });
    }

    const [lead] = await db.update(leadsTable).set(update).where(and(eq(leadsTable.id, id), eq(leadsTable.userId, req.userId!))).returning();
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
