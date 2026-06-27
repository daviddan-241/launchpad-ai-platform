import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/store";

type EnrichmentResult = {
  companyOverview: string;
  recentSignals: string[];
  techStack: string[];
  decisionMakerPattern: string;
  outreachAngle: string;
  updatedPainPoints: string[];
  buyingSignal: string;
  enrichedAt: string;
};

async function runEnrichment(lead: {
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  region: string;
  email: string;
  tags: string[];
  painPoints: string[];
  recentSignal: string;
}): Promise<EnrichmentResult | null> {
  const system = [
    "You are a B2B sales intelligence engine. Given a lead profile, generate deep research intel.",
    "Respond ONLY with a valid JSON object. No markdown, no explanation.",
    "The object must have these exact keys:",
    "companyOverview (string — 2 sentences about the company, what they do, size, market position),",
    "recentSignals (array of 3 strings — realistic recent buying triggers or news for this type of company),",
    "techStack (array of 4-6 strings — likely tools/platforms this company uses based on industry and size),",
    "decisionMakerPattern (string — how decisions are typically made at this type of company),",
    "outreachAngle (string — the strongest angle to open a conversation with this specific lead),",
    "updatedPainPoints (array of 4 strings — specific pain points for this role and company type),",
    "buyingSignal (string — the single most important buying signal that indicates readiness now).",
  ].join(" ");

  const userPrompt = JSON.stringify({
    name: lead.name,
    title: lead.title,
    company: lead.company,
    industry: lead.industry,
    companySize: lead.companySize,
    region: lead.region,
    email: lead.email,
    tags: lead.tags,
    knownPainPoints: lead.painPoints,
    recentSignal: lead.recentSignal,
  });

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
            generationConfig: { temperature: 0.5, responseMimeType: "application/json" },
          }),
        },
      );
      if (resp.ok) {
        const payload = (await resp.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const cleaned = text.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleaned) as EnrichmentResult;
        if (result.companyOverview) {
          return { ...result, enrichedAt: new Date().toISOString() };
        }
      }
    } catch {
      /* fall through */
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
          temperature: 0.5,
          response_format: { type: "json_object" },
        }),
      });
      if (resp.ok) {
        const payload = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = payload.choices?.[0]?.message?.content ?? "";
        const result = JSON.parse(text) as EnrichmentResult;
        if (result.companyOverview) {
          return { ...result, enrichedAt: new Date().toISOString() };
        }
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const store = await readStore();
    const lead = store.leads.find((l) => l.id === id);
    if (!lead) throw new Error("Lead not found.");

    const enrichment = await runEnrichment(lead);
    if (!enrichment) throw new Error("AI enrichment unavailable. Add GEMINI_API_KEY or GROQ_API_KEY.");

    await updateStore((draft) => {
      const target = draft.leads.find((l) => l.id === id);
      if (target) {
        (target as typeof target & { enrichment: EnrichmentResult }).enrichment = enrichment;
        target.lastTouched = "just now";
        if (enrichment.updatedPainPoints?.length) {
          target.painPoints = enrichment.updatedPainPoints;
        }
      }
      return draft;
    });

    await logActivityEvent({
      userId: user.id,
      type: "lead",
      title: `Enriched lead — ${lead.name} at ${lead.company}`,
      detail: `AI research complete: ${enrichment.buyingSignal.slice(0, 80)}`,
      status: "done",
    });

    return NextResponse.json({ ok: true, enrichment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enrichment failed." },
      { status: 400 },
    );
  }
}
