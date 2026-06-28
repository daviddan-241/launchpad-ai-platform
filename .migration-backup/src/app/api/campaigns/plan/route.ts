import { NextRequest, NextResponse } from "next/server";
import { generateSequencePlan } from "@/lib/ai-sequence";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt?.trim() || "book meetings with high-fit B2B decision makers";

  const plan = await generateSequencePlan(prompt);
  return NextResponse.json({ prompt, plan });
}
