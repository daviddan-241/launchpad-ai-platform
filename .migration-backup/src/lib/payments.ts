import { logActivityEvent } from "@/lib/activity";
import { createId, readStore, updateStore, type PaymentRequest, type User } from "@/lib/store";
import { getUserPreference } from "@/lib/preferences";

// ─── Internal ────────────────────────────────────────────────────────────────

async function createFlutterwaveLink(payment: PaymentRequest): Promise<string> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY not configured.");

  const resp = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      redirect_url: `${appUrl}/payments`,
      payment_options: "card,banktransfer,ussd",
      customer: { email: payment.clientEmail, name: payment.clientName },
      customizations: { title: "LeadForge Payment", description: payment.description },
      meta: { paymentRequestId: payment.id, paymentType: payment.paymentType, installmentCount: payment.installmentCount || 1 },
    }),
  });

  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Flutterwave error (${resp.status}): ${msg}`);
  }

  const payload = (await resp.json()) as { data?: { link?: string }; meta?: { authorization?: { redirect?: string } } };
  const link = payload.data?.link || payload.meta?.authorization?.redirect;
  if (!link) throw new Error("Flutterwave did not return a payment link.");
  return link;
}

// ─── Public functions ─────────────────────────────────────────────────────

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
    ownerApprovalRequired: true,
    sourceLeadId: params.sourceLeadId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await updateStore((store) => { store.paymentRequests.unshift(payment); });

  await logActivityEvent({
    userId: params.user.id, type: "payment",
    title: `Created payment draft for ${params.clientName}`,
    detail: `${payment.currency} ${payment.amount} · ${payment.paymentType}`,
    status: "pending",
  });

  return payment;
}

export async function approvePaymentRequest(user: User, paymentId: string) {
  const store = await readStore();
  const payment = store.paymentRequests.find((p) => p.id === paymentId && p.userId === user.id);
  if (!payment) throw new Error("Payment request not found.");

  const link = await createFlutterwaveLink(payment);

  await updateStore((draft) => {
    const t = draft.paymentRequests.find((p) => p.id === paymentId);
    if (t) {
      t.providerLink = link;
      t.providerReference = paymentId;
      t.status = "link_ready";
      t.approvedAt = new Date().toISOString();
      t.updatedAt = new Date().toISOString();
    }
  });

  await logActivityEvent({
    userId: user.id, type: "payment",
    title: `Approved payment for ${payment.clientName}`,
    detail: `${payment.currency} ${payment.amount}`,
    status: "done",
  });

  return link;
}

export async function declinePaymentRequest(user: User, paymentId: string) {
  await updateStore((draft) => {
    const t = draft.paymentRequests.find((p) => p.id === paymentId && p.userId === user.id);
    if (!t) throw new Error("Payment request not found.");
    t.status = "declined";
    t.declinedAt = new Date().toISOString();
    t.updatedAt = new Date().toISOString();
  });

  await logActivityEvent({
    userId: user.id, type: "payment",
    title: `Declined payment request ${paymentId}`,
    detail: "Owner declined the payment link.",
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
    const inactiveMin = (now - lastSeen) / 60_000;
    if (inactiveMin < preference.autoPreparePaymentAfterMinutes) continue;

    const pending = store.paymentRequests.find(
      (p) => p.userId === user.id && p.status === "awaiting_approval" && !p.providerLink,
    );
    if (!pending) continue;

    try {
      await approvePaymentRequest(user, pending.id);
    } catch { /* leave as draft if Flutterwave not configured */ }
  }
}

// ─── Autonomous: create payment + Flutterwave link immediately (no owner approval) ──

export async function autoCreateAndSendPayment(params: {
  userId: string;
  clientName: string;
  clientEmail: string;
  description: string;
  amount: number;
  currency: string;
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

  let link: string;
  try {
    link = await createFlutterwaveLink(payment);
    payment.providerLink = link;
    payment.approvedAt = new Date().toISOString();
  } catch {
    // Flutterwave not configured — use a fallback URL so the conversation still flows
    link = `${process.env.APP_URL ?? "https://your-app.onrender.com"}/payments`;
    payment.status = "draft";
    payment.lastError = "Flutterwave key not configured — add FLUTTERWAVE_SECRET_KEY in Render env vars";
  }

  await updateStore((store) => { store.paymentRequests.unshift(payment); });

  await logActivityEvent({
    userId: params.userId, type: "payment",
    title: `Auto-payment created for ${params.clientName}`,
    detail: `${params.currency} ${params.amount} — ${params.description}`,
    status: "done",
  });

  return { id: payment.id, link };
}
