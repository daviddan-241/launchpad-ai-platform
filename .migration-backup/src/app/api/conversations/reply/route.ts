import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { sendEmailWithAccount } from "@/lib/email";
import { logActivityEvent } from "@/lib/activity";
import { readStore, updateStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      campaignId?: string;
      leadId?: string;
      message?: string;
      subject?: string;
    };

    if (!body.campaignId || !body.leadId || !body.message?.trim()) {
      return NextResponse.json({ error: "campaignId, leadId, and message are required." }, { status: 400 });
    }

    const store = await readStore();
    const campaign = store.autonomousCampaigns?.find(
      (c) => c.id === body.campaignId && c.userId === user.id,
    );
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

    const step = campaign.steps.find((s) => s.leadId === body.leadId);
    if (!step) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const account = store.emailAccounts.find(
      (a) => a.id === campaign.emailAccountId && a.userId === user.id,
    );
    if (!account) return NextResponse.json({ error: "Email account not found." }, { status: 404 });

    const subject = body.subject?.trim() || `Re: ${campaign.offer}`;
    const html = body.message.split("\n").map((l) => `<p>${l}</p>`).join("");

    await sendEmailWithAccount({
      accountId: account.id,
      to: step.leadEmail,
      subject,
      html,
      text: body.message,
    });

    await updateStore((draft) => {
      const c = draft.autonomousCampaigns?.find((x) => x.id === body.campaignId);
      const s = c?.steps.find((x) => x.leadId === body.leadId);
      if (s) {
        s.conversationHistory = [
          ...(s.conversationHistory ?? []),
          { role: "assistant", content: body.message!, sentAt: new Date().toISOString() },
        ];
        s.lastActionAt = new Date().toISOString();
        // Pause AI auto-replies for this lead for 24h so human is in control
        s.nextResponseAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
    });

    await logActivityEvent({
      userId: user.id,
      type: "outreach",
      title: `Manual reply sent to ${step.leadName} at ${step.company}`,
      detail: subject,
      status: "done",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reply." },
      { status: 500 },
    );
  }
}
