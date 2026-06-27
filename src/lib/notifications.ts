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
  clientName: string; clientEmail: string; amount: number; currency: string; offer: string;
}): Promise<void> {
  await sendTelegram(
    `💸 <b>PAYMENT RECEIVED</b>\n\nClient: ${params.clientName}\nEmail: ${params.clientEmail}\nAmount: <b>${params.currency} ${params.amount.toLocaleString()}</b>\nOffer: ${params.offer}\n\nMoney is in your Flutterwave account.`,
  );
}

export async function notifyInterestedReply(params: {
  clientName: string; clientEmail: string; company: string; replyText: string;
}): Promise<void> {
  await sendTelegram(
    `🔥 <b>HOT LEAD REPLIED</b>\n\n${params.clientName} @ ${params.company} is interested.\n\n"${params.replyText.slice(0, 200)}"\n\nLeadForge is handling the conversation automatically.`,
  );
}

export async function notifyPaymentLinkSent(params: {
  clientName: string; clientEmail: string; amount: number; currency: string;
}): Promise<void> {
  await sendTelegram(
    `💳 <b>PAYMENT LINK SENT</b>\n\nClient: ${params.clientName}\nEmail: ${params.clientEmail}\nAmount: ${params.currency} ${params.amount.toLocaleString()}\n\nWaiting for payment to complete.`,
  );
}

export async function notifyCampaignComplete(params: {
  campaignName: string; emailed: number; replied: number; paid: number;
}): Promise<void> {
  await sendTelegram(
    `✅ <b>CAMPAIGN COMPLETE</b>\n\n${params.campaignName}\n\nEmailed: ${params.emailed}\nReplied: ${params.replied}\nPayments sent: ${params.paid}`,
  );
}
