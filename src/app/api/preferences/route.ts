import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { getUserPreference, saveUserPreference } from "@/lib/preferences";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const preference = await getUserPreference(user.id);
    return NextResponse.json({ preference });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      currency?: string;
      starterPrice?: number;
      businessPrice?: number;
      premiumPrice?: number;
      paymentInstructions?: string;
      waitIfInactive?: boolean;
      autoPreparePaymentAfterMinutes?: number;
      autoPreparePaymentEnabled?: boolean;
    };

    const preference = await saveUserPreference({
      userId: user.id,
      currency: body.currency?.trim().toUpperCase() || "USD",
      starterPrice: Number(body.starterPrice ?? 120),
      businessPrice: Number(body.businessPrice ?? 350),
      premiumPrice: Number(body.premiumPrice ?? 900),
      paymentInstructions: body.paymentInstructions?.trim() || "Ask the owner which payment method to use before sharing checkout details.",
      waitIfInactive: Boolean(body.waitIfInactive),
      autoPreparePaymentAfterMinutes: Number(body.autoPreparePaymentAfterMinutes ?? 30),
      autoPreparePaymentEnabled: Boolean(body.autoPreparePaymentEnabled),
    });

    await logActivityEvent({
      userId: user.id,
      type: "settings",
      title: "Updated pricing preferences",
      detail: `${preference.currency} ${preference.starterPrice} / ${preference.businessPrice} / ${preference.premiumPrice}`,
      status: "done",
    });

    return NextResponse.json({ ok: true, message: "Pricing preferences saved.", preference });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save preferences." }, { status: 400 });
  }
}
