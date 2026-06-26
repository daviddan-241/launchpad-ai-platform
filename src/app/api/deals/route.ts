import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { createDeal } from "@/lib/crm";
import { readStore } from "@/lib/store";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const store = await readStore();
    return NextResponse.json({ deals: store.deals.filter((item) => item.userId === user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      clientName?: string;
      clientEmail?: string;
      company?: string;
      value?: number;
      currency?: string;
      description?: string;
      leadId?: string;
      nextAction?: string;
    };

    if (!body.clientName || !body.clientEmail || !body.company || !body.description) {
      throw new Error("Client name, email, company, and description are required.");
    }

    const deal = await createDeal({
      user,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      company: body.company,
      value: body.value,
      currency: body.currency,
      description: body.description,
      leadId: body.leadId,
      nextAction: body.nextAction,
    });

    return NextResponse.json({ ok: true, message: "Deal created.", deal });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create deal." }, { status: 400 });
  }
}
