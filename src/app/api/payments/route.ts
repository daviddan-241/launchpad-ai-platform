import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { createPaymentDraft } from "@/lib/payments";
import { readStore } from "@/lib/store";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const store = await readStore();
    return NextResponse.json({ requests: store.paymentRequests.filter((item) => item.userId === user.id) });
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
      description?: string;
      amount?: number;
      currency?: string;
      paymentType?: "full" | "part" | "monthly";
      installmentCount?: number;
      signatureRequired?: boolean;
      sourceLeadId?: string;
    };

    if (!body.clientName || !body.clientEmail || !body.description || !body.amount || !body.paymentType) {
      throw new Error("Client, description, amount, and payment type are required.");
    }

    await createPaymentDraft({
      user,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      description: body.description,
      amount: Number(body.amount),
      currency: body.currency,
      paymentType: body.paymentType,
      installmentCount: body.installmentCount,
      signatureRequired: body.signatureRequired,
      sourceLeadId: body.sourceLeadId,
    });

    return NextResponse.json({ ok: true, message: "Payment draft created and waiting for approval." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create payment draft." }, { status: 400 });
  }
}
