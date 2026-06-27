import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { declinePaymentRequest } from "@/lib/payments";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) throw new Error("Payment id is required.");
    await declinePaymentRequest(user, body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not decline payment." }, { status: 400 });
  }
}
