import { NextResponse } from "next/server";
import { generateSequencePlan, searchLeads } from "@/lib/demo-data";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt?.trim() || "Find high-fit B2B decision makers and book meetings";
  const leads = searchLeads(prompt).slice(0, 4).map((lead) => ({
    id: lead.id,
    name: lead.name,
    company: lead.company,
    title: lead.title,
    fitScore: lead.fitScore,
    intentScore: lead.intentScore,
  }));

  return NextResponse.json({
    prompt,
    leads,
    plan: generateSequencePlan(prompt),
  });
}
