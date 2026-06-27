import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { moveDealStage } from "@/lib/crm";
import type { DealStage } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { dealId?: string; stage?: DealStage; nextAction?: string };
    if (!body.dealId || !body.stage) throw new Error("Deal id and stage are required.");
    const deal = await moveDealStage({ user, dealId: body.dealId, stage: body.stage, nextAction: body.nextAction });
    return NextResponse.json({ ok: true, deal });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not move deal." }, { status: 400 });
  }
}
