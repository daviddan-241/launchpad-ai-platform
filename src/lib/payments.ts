import { logActivityEvent } from "@/lib/activity";
import { createId, readStore, updateStore, type PaymentRequest, type User } from "@/lib/store";
import { getUserPreference } from "@/lib/preferences";

async function createFlutterwaveLink(payment: PaymentRequest) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (!secret) {
    throw new Error("FLUTTERWAVE_SECRET_KEY is missing.");
  }

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      redirect_url: `${appUrl}/payments`,
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: payment.clientEmail,
        name: payment.clientName,
      },
      customizations: {
        title: "LeadForge Payment",
        description: payment.description,
      },
      meta: {
        paymentRequestId: payment.id,
        paymentType: payment.paymentType,
        installmentCount: payment.installmentCount || 1,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Flutterwave link creation failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as { data?: { link?: string }; meta?: { authorization?: { redirect?: string } } };
  const link = payload.data?.link || payload.meta?.authorization?.redirect;
  if (!link) {
    throw new Error("Flutterwave did not return a payment link.");
  }
  return link;
}

export async function createPaymentDraft(params: {
  user: User;
  clientName: string;
  clientEmail: string;
  description: string;
  amount: number;
  currency?: string;
  paymentType: "full" | "part" | "monthly";
  installmentCount?: number;
  signatureRequired?: boolean;
  sourceLeadId?: string;
}) {
  const preference = await getUserPreference(params.user.id);
  const payment: PaymentRequest = {
    id: createId("PAY"),
    userId: params.user.id,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    description: params.description,
    amount: params.amount,
    currency: params.currency || preference.currency,
    paymentType: params.paymentType,
    installmentCount: params.installmentCount,
    signatureRequired: Boolean(params.signatureRequired),
    provider: "flutterwave",
    status: "awaiting_approval",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceLeadId: params.sourceLeadId,
    ownerApprovalRequired: true,
  };

  await updateStore((store) => {
    store.paymentRequests.unshift(payment);
    return store;
  });

  await logActivityEvent({
    userId: params.user.id,
    type: "payment",
    title: `Created payment draft for ${params.clientName}`,
    detail: `${payment.currency} ${payment.amount} · ${payment.paymentType}`,
    status: "pending",
  });

  return payment;
}

export async function approvePaymentRequest(user: User, paymentId: string) {
  const store = await readStore();
  const payment = store.paymentRequests.find((item) => item.id === paymentId && item.userId === user.id);
  if (!payment) throw new Error("Payment request not found.");

  const link = await createFlutterwaveLink(payment);
  await updateStore((draft) => {
    const target = draft.paymentRequests.find((item) => item.id === paymentId);
    if (target) {
      target.providerLink = link;
      target.providerReference = paymentId;
      target.status = "link_ready";
      target.approvedAt = new Date().toISOString();
      target.updatedAt = new Date().toISOString();
    }
    return draft;
  });

  await logActivityEvent({
    userId: user.id,
    type: "payment",
    title: `Approved payment for ${payment.clientName}`,
    detail: `${payment.currency} ${payment.amount}`,
    status: "done",
  });

  return link;
}

export async function declinePaymentRequest(user: User, paymentId: string) {
  await updateStore((draft) => {
    const target = draft.paymentRequests.find((item) => item.id === paymentId && item.userId === user.id);
    if (!target) {
      throw new Error("Payment request not found.");
    }
    target.status = "declined";
    target.declinedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();
    return draft;
  });

  await logActivityEvent({
    userId: user.id,
    type: "payment",
    title: `Declined payment request ${paymentId}`,
    detail: "Owner chose not to release the payment link.",
    status: "failed",
  });
}

export async function processInactivePaymentDrafts() {
  const store = await readStore();
  const now = Date.now();

  for (const user of store.users) {
    const preference = await getUserPreference(user.id);
    if (!preference.autoPreparePaymentEnabled) continue;
    const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : now;
    const inactiveForMinutes = (now - lastSeen) / 60000;
    if (inactiveForMinutes < preference.autoPreparePaymentAfterMinutes) continue;

    const pending = store.paymentRequests.find(
      (item) => item.userId === user.id && item.status === "awaiting_approval" && !item.providerLink,
    );
    if (!pending) continue;

    try {
      await approvePaymentRequest(user, pending.id);
    } catch {
      // leave as awaiting approval if provider config is missing
    }
  }
}


// ─── Fully autonomous payment: create + generate link + email client immediately ───

export async function autoCreateAndSendPayment(params: {
  userId: string;
  emailAccountId: string;
  clientName: string;
  clientEmail: string;
  description: string;
  amount: number;
  currency: string;
  senderName: string;
}): Promise<{ id: string; link: string }> {
  const preference = await getUserPreference(params.userId);
  const payment: PaymentRequest = {
    id: createId("PAY"),
    userId: params.userId,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    description: params.description,
    amount: params.amount,
    currency: params.currency || preference.currency,
    paymentType: "full",
    signatureRequired: false,
    provider: "flutterwave",
    status: "link_ready",
    ownerApprovalRequired: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let link = "";
  try {
    link = await createFlutterwaveLink(payment);
    payment.providerLink = link;
    payment.approvedAt = new Date().toISOString();
  } catch {
    // No Flutterwave key — send a payment-pending email anyway
    link = `${process.env.APP_URL ?? "https://your-app.onrender.com"}/payments`;
    payment.status = "draft";
    payment.lastError = "Flutterwave key not configured";
  }

  await updateStore((store) => {
    store.paymentRequests.unshift(payment);
    return store;
  });

  await logActivityEvent({
    userId: params.userId,
    type: "payment",
    title: `Auto-payment created for ${params.clientName}`,
    detail: `${params.currency} ${params.amount} — ${params.description}`,
    status: "done",
  });

  return { id: payment.id, link };
}
