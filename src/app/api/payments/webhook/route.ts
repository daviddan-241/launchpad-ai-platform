import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { readStore, updateStore } from "@/lib/store";
import { sendEmailWithAccount } from "@/lib/email";

function htmlReceipt(params: { name: string; amount: number; currency: string; ref: string; description: string }) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0b0610;color:#f0f0f0;border-radius:16px;overflow:hidden">
      <div style="background:#1a0a2e;padding:32px 24px;text-align:center">
        <p style="font-size:13px;letter-spacing:0.2em;color:#d8b4fe;text-transform:uppercase;margin:0">LeadForge</p>
        <h1 style="font-size:24px;margin:12px 0 0;color:#fff">Payment received</h1>
      </div>
      <div style="padding:32px 24px">
        <p style="color:#c4b5fd;margin:0 0 8px">Hi ${params.name.split(" ")[0]},</p>
        <p style="color:#d1d5db;margin:0 0 24px">Your payment was received successfully. Here is your receipt.</p>
        <div style="background:#1a0a2e;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:12px">Amount paid</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#a78bfa">${params.currency} ${params.amount.toLocaleString()}</p>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Description</td><td style="color:#e2e8f0;font-size:13px;text-align:right">${params.description}</td></tr>
          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Reference</td><td style="color:#e2e8f0;font-size:13px;text-align:right;font-family:monospace">${params.ref}</td></tr>
          <tr><td style="color:#94a3b8;font-size:13px;padding:6px 0">Date</td><td style="color:#e2e8f0;font-size:13px;text-align:right">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
        </table>
        <p style="margin:24px 0 0;color:#6b7280;font-size:12px">This is a system-generated receipt. No signature is required.</p>
      </div>
    </div>`.trim();
}

export async function POST(request: Request) {
  try {
    const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const verifHash = request.headers.get("verif-hash");

    if (webhookHash && verifHash !== webhookHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      event?: string;
      data?: {
        id?: number;
        tx_ref?: string;
        amount?: number;
        currency?: string;
        status?: string;
        customer?: { name?: string; email?: string };
      };
    } | null;

    if (!body?.data || body.data.status !== "successful") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { tx_ref, amount, currency, customer } = body.data;
    if (!tx_ref || !amount) return NextResponse.json({ ok: true, ignored: true });

    const store = await readStore();
    const payment = store.paymentRequests.find((p) => p.id === tx_ref);
    if (!payment) return NextResponse.json({ ok: true, ignored: true });

    await updateStore((draft) => {
      const p = draft.paymentRequests.find((x) => x.id === tx_ref);
      if (p) {
        p.status = "paid";
        p.paidAt = new Date().toISOString();
        p.updatedAt = new Date().toISOString();
      }

      if (payment.sourceLeadId) {
        const deal = draft.deals.find(
          (d) => d.userId === payment.userId && d.leadId === payment.sourceLeadId,
        );
        if (deal && deal.stage !== "Won") {
          deal.stage = "Won";
          deal.updatedAt = new Date().toISOString();
          if (!deal.closedAt) deal.closedAt = new Date().toISOString();
        }
      }

      return draft;
    });

    await logActivityEvent({
      userId: payment.userId,
      type: "payment",
      title: `Payment received — ${currency ?? payment.currency} ${amount}`,
      detail: `From ${customer?.name ?? payment.clientName} · ref ${tx_ref}`,
      status: "done",
    });

    const account = store.emailAccounts.find((a) => a.userId === payment.userId);
    if (account) {
      const html = htmlReceipt({
        name: customer?.name ?? payment.clientName,
        amount,
        currency: currency ?? payment.currency,
        ref: tx_ref,
        description: payment.description,
      });
      await sendEmailWithAccount({
        accountId: account.id,
        to: customer?.email ?? payment.clientEmail,
        subject: `Receipt — ${currency ?? payment.currency} ${amount} received`,
        html,
        text: `Hi ${(customer?.name ?? payment.clientName).split(" ")[0]}, your payment of ${currency ?? payment.currency} ${amount} was received. Reference: ${tx_ref}.`,
      }).catch(() => undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook error" }, { status: 500 });
  }
}
