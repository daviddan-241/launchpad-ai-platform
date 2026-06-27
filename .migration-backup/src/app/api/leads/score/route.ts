import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { scoreAndPersistLead } from "@/lib/lead-scorer";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      campaignId?: string;
      leadId?: string;
    };
    if (!body.campaignId || !body.leadId) {
      return NextResponse.json({ error: "campaignId and leadId required." }, { status: 400 });
    }
    const store = await readStore();
    const campaign = store.autonomousCampaigns?.find(
      (c) => c.id === body.campaignId && c.userId === user.id,
    );
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    const step = campaign.steps.find((s) => s.leadId === body.leadId);
    if (!step) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const result = await scoreAndPersistLead({
      campaignId: campaign.id,
      leadId: step.leadId,
      history: step.conversationHistory ?? [],
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scoring failed." },
      { status: 500 },
    );
  }
}
