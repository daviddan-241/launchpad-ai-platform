import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { sendEmailWithAccount } from "@/lib/email";
import { logActivityEvent } from "@/lib/activity";
import { readStore, updateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function heuristicReply(message: string): string {
  const lower = message.toLowerCase();
  if (/timing|next month|later|busy/i.test(lower))
    return "Totally fair. I'll keep this light for now and follow up when timing is better. In the meantime, I can send a short checklist your team can use so you already have the playbook when you're ready.";
  if (/price|budget|cost/i.test(lower))
    return "Happy to break down the value clearly. Since this build is free-first, I'd focus on the workflows that reduce manual prospecting, improve routing, and help your reps book more meetings without adding more tools.";
  if (/salesforce|crm|hubspot/i.test(lower))
    return "Yes — the best setup is to sync only the fields that matter, apply dedupe rules first, and push updates back to the CRM in a controlled way so reps always see fresh records instead of duplicates.";
  return "Thanks for the note. Based on what you shared, I'd tailor the workflow around your current process, keep the rollout simple, and focus first on the fastest path to more qualified conversations. If helpful, I can outline the exact next steps for your team.";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    messageId?: string;
    replyText?: string;
    subject?: string;
  };

  // Draft generation mode — no messageId, no auth required
  if (!body.messageId) {
    return NextResponse.json({ draft: heuristicReply(body.message?.trim() || "") });
  }

  // Real send mode — auth required
  try {
    const user = await requireCurrentUser();
    const { messageId, replyText, subject } = body;

    if (!replyText?.trim()) {
      return NextResponse.json({ error: "replyText is required." }, { status: 400 });
    }

    const store = await readStore();
    const inboxMsg = store.inbox.find((m) => m.id === messageId);
    if (!inboxMsg) return NextResponse.json({ error: "Message not found." }, { status: 404 });
    if (!inboxMsg.fromEmail) return NextResponse.json({ error: "No email address on this message." }, { status: 400 });

    const account = store.emailAccounts.find((a) => a.userId === user.id);
    if (!account) {
      return NextResponse.json(
        { error: "No email account connected. Add one in Settings → Email integrations." },
        { status: 400 },
      );
    }

    const replySubject = subject?.trim() || (inboxMsg.subject.startsWith("Re:") ? inboxMsg.subject : `Re: ${inboxMsg.subject}`);
    const html = replyText.split("\n").map((l) => `<p>${l || "&nbsp;"}</p>`).join("");

    await sendEmailWithAccount({ accountId: account.id, to: inboxMsg.fromEmail, subject: replySubject, html, text: replyText });

    await updateStore((draft) => {
      const msg = draft.inbox.find((m) => m.id === messageId);
      if (msg) { msg.replySent = true; msg.replySentAt = new Date().toISOString(); }
      return draft;
    });

    await logActivityEvent({
      userId: user.id,
      type: "outreach",
      title: `Reply sent to ${inboxMsg.from}`,
      detail: replySubject,
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
