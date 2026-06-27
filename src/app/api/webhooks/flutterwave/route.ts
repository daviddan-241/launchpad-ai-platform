import { NextRequest, NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { sendEmailWithAccount } from "@/lib/email";
import { notifyPaymentReceived } from "@/lib/notifications";
import { readStore, updateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

type FlutterwaveEvent = {
  event: string;
  data: {
    tx_ref: string;
    status: string;
    amount: number;
    currency: string;
    customer: { email: string; name: string };
    flw_ref?: string;
    id?: number;
  };
};

async function sendThankYouEmail(params: {
  accountId: string;
  toEmail: string;
  toName: string;
  offer: string;
  amount: number;
  currency: string;
  senderName: string;
}): Promise<void> {
  const first = params.toName.split(" ")[0];
  const body = `Hi ${first},

Your payment of ${params.currency} ${params.amount.toLocaleString()} has been received. Thank you.

I'll be in touch within 24 hours to kick things off on ${params.offer}.

Looking forward to working with you.

${params.senderName}`;

  await sendEmailWithAccount({
    accountId: params.accountId,
    to: params.toEmail,
    subject: `Payment confirmed — ${params.offer}`,
    html: body.split("\n").map((l) => `<p>${l}</p>`).join(""),
    text: body,
  });
}

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const hash = request.headers.get("verif-hash");
  const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (expectedHash && hash !== expectedHash) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: FlutterwaveEvent;
  try {
    body = (await request.json()) as FlutterwaveEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.event !== "charge.completed" || body.data?.status !== "successful") {
    return NextResponse.json({ ok: true, message: "Ignored non-payment event." });
  }

  const { tx_ref, amount, currency, customer } = body.data;
  if (!tx_ref) return NextResponse.json({ error: "Missing tx_ref." }, { status: 400 });

  const store = await readStore();
  const payment = store.paymentRequests.find((p) => p.id === tx_ref);
  if (!payment) {
    return NextResponse.json({ ok: true, message: "Payment not found in store — may be a test." });
  }

  // Mark payment as paid
  await updateStore((draft) => {
    const p = draft.paymentRequests.find((x) => x.id === tx_ref);
    if (p) {
      p.status = "paid";
      p.paidAt = new Date().toISOString();
      p.updatedAt = new Date().toISOString();
      if (body.data.flw_ref) p.providerReference = body.data.flw_ref;
    }
  });

  // Mark the campaign lead as paid and close conversation
  const allCampaigns = store.autonomousCampaigns ?? [];
  for (const campaign of allCampaigns) {
    const step = campaign.steps.find((s) => s.paymentId === tx_ref);
    if (!step) continue;

    // Get email account for sending thank-you
    const account = store.emailAccounts.find(
      (a) => a.id === campaign.emailAccountId && a.userId === campaign.userId,
    );
    const senderName = store.users.find((u) => u.id === campaign.userId)?.name ?? "The team";

    // Update step status
    await updateStore((draft) => {
      const c = draft.autonomousCampaigns?.find((x) => x.id === campaign.id);
      const s = c?.steps.find((x) => x.paymentId === tx_ref);
      if (s) {
        s.status = "paid";
        s.conversationState = "paid";
        s.lastActionAt = new Date().toISOString();
        s.nextResponseAt = undefined; // Stop AI from replying to a closed deal
      }
      if (c) {
        c.totalPaid = (c.totalPaid || 0) + 1;
        c.totalRevenue = (c.totalRevenue || 0) + amount;
        c.updatedAt = new Date().toISOString();
      }
    });

    // Send thank-you email if we have an email account
    if (account) {
      await sendThankYouEmail({
        accountId: account.id,
        toEmail: customer.email || step.leadEmail,
        toName: customer.name || step.leadName,
        offer: campaign.offer,
        amount,
        currency,
        senderName,
      }).catch(() => undefined);
    }

    // Log activity
    await logActivityEvent({
      userId: campaign.userId,
      type: "payment",
      title: `Payment received from ${step.leadName} at ${step.company}`,
      detail: `${currency} ${amount.toLocaleString()} — ${campaign.offer}`,
      status: "done",
    });

    break; // Found and processed
  }

  // Telegram notification
  await notifyPaymentReceived({
    clientName: customer.name || payment.clientName,
    clientEmail: customer.email || payment.clientEmail,
    amount,
    currency,
    offer: payment.description,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
