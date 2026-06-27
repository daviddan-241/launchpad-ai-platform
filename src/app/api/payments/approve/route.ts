import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { approvePaymentRequest } from "@/lib/payments";
import { readStore } from "@/lib/store";
import { sendEmailWithAccount } from "@/lib/email";

function htmlFromText(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p style="margin:0 0 12px;font-family:sans-serif;font-size:15px;color:#1a1a2e;">${l}</p>`)
    .join("");
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    if (!body.id) throw new Error("Payment id is required.");

    const storeBefore = await readStore();
    const payment = storeBefore.paymentRequests.find((p) => p.id === body.id && p.userId === user.id);

    const link = await approvePaymentRequest(user, body.id);

    if (payment && link) {
      const account = storeBefore.emailAccounts.find((a) => a.userId === user.id);
      if (account) {
        const text = [
          `Hi ${payment.clientName.split(" ")[0]},`,
          "",
          `Your payment link is ready. Please use the link below to complete your payment of ${payment.currency} ${payment.amount}.`,
          "",
          link,
          "",
          payment.paymentType === "part"
            ? `This is a part-payment arrangement — ${payment.installmentCount ?? 2} installments.`
            : payment.paymentType === "monthly"
              ? `This is a monthly payment plan — ${payment.installmentCount ?? 3} installments.`
              : "Full payment is due upon completion.",
          "",
          "Thank you for moving forward. Please reach out with any questions.",
          "",
          user.name,
        ].join("\n");

        await sendEmailWithAccount({
          accountId: account.id,
          to: payment.clientEmail,
          subject: `Payment ready — ${payment.currency} ${payment.amount}`,
          html: htmlFromText(text),
          text,
        }).catch(() => undefined);
      }
    }

    return NextResponse.json({ ok: true, link });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not approve payment." }, { status: 400 });
  }
}
