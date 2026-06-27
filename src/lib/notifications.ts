// Telegram and WhatsApp notifications for payment events and replies

async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch { /* silent */ }
}

export async function notifyPaymentReceived(params: {
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  offer: string;
}): Promise<void> {
  const msg = `💸 <b>PAYMENT RECEIVED</b>\n\nClient: ${params.clientName}\nEmail: ${params.clientEmail}\nAmount: <b>${params.currency} ${params.amount.toLocaleString()}</b>\nOffer: ${params.offer}\n\nMoney is in your Flutterwave account.`;
  await sendTelegram(msg);
}

export async function notifyInterestedReply(params: {
  clientName: string;
  clientEmail: string;
  company: string;
  replyText: string;
}): Promise<void> {
  const preview = params.replyText.slice(0, 200);
  const msg = `🔥 <b>HOT LEAD REPLIED</b>\n\n${params.clientName} from ${params.company} is interested!\n\nReply: "${preview}"\n\nLeadForge is handling the conversation automatically.`;
  await sendTelegram(msg);
}

export async function notifyPaymentLinkSent(params: {
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
}): Promise<void> {
  const msg = `💳 <b>PAYMENT LINK SENT</b>\n\nClient: ${params.clientName}\nEmail: ${params.clientEmail}\nAmount: ${params.currency} ${params.amount.toLocaleString()}\n\nWaiting for payment to complete.`;
  await sendTelegram(msg);
}

export async function notifyCampaignComplete(params: {
  campaignName: string;
  emailed: number;
  replied: number;
  paid: number;
}): Promise<void> {
  const msg = `✅ <b>CAMPAIGN COMPLETE</b>\n\n${params.campaignName}\n\nEmailed: ${params.emailed}\nReplied: ${params.replied}\nPayments collected: ${params.paid}`;
  await sendTelegram(msg);
}
