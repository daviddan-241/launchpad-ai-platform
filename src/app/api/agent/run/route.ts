import { NextResponse } from "next/server";
import { generateSequencePlan } from "@/lib/ai-sequence";
import { readStore } from "@/lib/store";

function scoreMatch(lead: { name: string; company: string; title: string; industry: string; region: string; tags: string[]; painPoints: string[] }, query: string): number {
  const haystack = [lead.name, lead.company, lead.title, lead.industry, lead.region, ...lead.tags, ...lead.painPoints].join(" ").toLowerCase();
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tokens.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt?.trim() || "Find high-fit B2B decision makers and book meetings";

  const store = await readStore();

  const leads = store.leads
    .map((lead) => ({ lead, score: scoreMatch(lead, prompt) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.lead.fitScore - a.lead.fitScore)
    .slice(0, 4)
    .map(({ lead }) => ({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      title: lead.title,
      fitScore: lead.fitScore,
      intentScore: lead.intentScore,
    }));

  const plan = await generateSequencePlan(prompt);

  return NextResponse.json({ prompt, leads, plan });
}
