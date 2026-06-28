import { NextRequest, NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { createId, readStore, updateStore } from "@/lib/store";

type LeadShape = {
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  region: string;
  email: string;
  linkedin: string;
  fitScore: number;
  intentScore: number;
  nextStep: string;
  tags: string[];
  painPoints: string[];
  recentSignal: string;
};

async function aiSearchLeads(query: string): Promise<LeadShape[]> {
  const system = [
    "You are a B2B lead intelligence engine.",
    "Generate realistic, specific lead profiles matching the user's search query.",
    "Respond ONLY with a valid JSON array of lead objects. No markdown, no explanation.",
    "Each object must have: name, title, company, industry, companySize, region, email, linkedin, fitScore (0-100), intentScore (0-100), nextStep, tags (array), painPoints (array), recentSignal.",
    "Make names, companies, and emails realistic for the region/industry. Email format: firstname.lastname@company.com.",
    "fitScore and intentScore must be integers 40-95.",
    "Generate exactly 6 leads. Return only the JSON array.",
  ].join(" ");

  const userPrompt = `Generate B2B sales leads matching this search: "${query}"`;

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
          }),
        },
      );
      if (resp.ok) {
        const payload = (await resp.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const leads = JSON.parse(cleaned) as LeadShape[];
        if (Array.isArray(leads) && leads.length) return leads.slice(0, 8);
      }
    } catch {
      /* fall through to Groq */
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.6,
          response_format: { type: "json_object" },
        }),
      });
      if (resp.ok) {
        const payload = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = payload.choices?.[0]?.message?.content ?? "";
        const parsed = JSON.parse(text) as { leads?: LeadShape[] } | LeadShape[];
        const leads = Array.isArray(parsed) ? parsed : (parsed as { leads?: LeadShape[] }).leads ?? [];
        if (leads.length) return leads.slice(0, 8);
      }
    } catch {
      /* fall through */
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  const store = await readStore();

  if (!query) {
    return NextResponse.json({ query: "", count: store.leads.length, results: store.leads });
  }

  const aiLeads = await aiSearchLeads(query);

  // Also search real stored leads
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const storeMatches = store.leads.filter((lead) => {
    const haystack = [lead.name, lead.company, lead.title, lead.industry, lead.region, ...lead.tags, ...lead.painPoints].join(" ").toLowerCase();
    return tokens.some((t) => haystack.includes(t));
  });

  const merged = [
    ...storeMatches,
    ...aiLeads.map((l) => ({
      id: createId("LD"),
      name: l.name,
      title: l.title,
      company: l.company,
      industry: l.industry,
      companySize: l.companySize ?? "1-50",
      region: l.region,
      email: l.email,
      linkedin: l.linkedin,
      fitScore: Math.min(100, Math.max(0, Number(l.fitScore) || 70)),
      intentScore: Math.min(100, Math.max(0, Number(l.intentScore) || 60)),
      stage: "New" as const,
      nextStep: l.nextStep ?? "Review and queue outreach",
      tags: Array.isArray(l.tags) ? l.tags : [],
      painPoints: Array.isArray(l.painPoints) ? l.painPoints : [],
      recentSignal: l.recentSignal ?? "AI-sourced match",
      lastTouched: "just now",
    })),
  ];

  return NextResponse.json({ query, count: merged.length, results: merged, aiGenerated: aiLeads.length });
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      title?: string;
      company?: string;
      industry?: string;
      region?: string;
      email?: string;
    };

    const name = body.name?.trim();
    const title = body.title?.trim();
    const company = body.company?.trim();
    const industry = body.industry?.trim();
    const region = body.region?.trim();
    const email = body.email?.trim();

    if (!name || !title || !company || !industry || !region || !email) {
      throw new Error("Please fill in all lead fields.");
    }

    let created = null;
    await updateStore((store) => {
      created = {
        id: createId("LD"),
        name,
        title,
        company,
        industry,
        companySize: "1-50",
        region,
        email,
        linkedin: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, "-")}`,
        fitScore: 75,
        intentScore: 62,
        stage: "New" as const,
        nextStep: "Review lead, enrich data, and queue first outreach touch",
        tags: [industry.toLowerCase(), region.toLowerCase()],
        painPoints: ["manual prospecting", "slow follow-up"],
        recentSignal: `Added manually on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        lastTouched: "just now",
      };
      store.leads.unshift(created);
      return store;
    });

    await logActivityEvent({
      userId: user.id,
      type: "lead",
      title: `Created lead ${name}`,
      detail: `${company} · ${email}`,
      status: "done",
    });

    return NextResponse.json({ ok: true, lead: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create lead." },
      { status: 400 },
    );
  }
}
