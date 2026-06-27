import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { launchAutonomousCampaign } from "@/lib/autonomous";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      niche?: string;
      offer?: string;
      price?: number;
      currency?: string;
      targetCount?: number;
      region?: string;
      emailAccountId?: string;
    };

    if (!body.niche || !body.offer || !body.price || !body.emailAccountId) {
      return NextResponse.json({ error: "niche, offer, price, and emailAccountId are required." }, { status: 400 });
    }

    const store = await readStore();
    const account = store.emailAccounts.find((a) => a.id === body.emailAccountId && a.userId === user.id);
    if (!account) {
      return NextResponse.json({ error: "Email account not found." }, { status: 400 });
    }

    const campaign = await launchAutonomousCampaign({
      userId: user.id,
      name: body.name || `Auto: ${body.niche} → ${body.offer}`,
      niche: body.niche,
      offer: body.offer,
      price: body.price,
      currency: body.currency || "USD",
      targetCount: Math.min(body.targetCount || 10, 100),
      region: body.region,
      emailAccountId: body.emailAccountId,
    });

    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Launch failed." }, { status: 500 });
  }
}
