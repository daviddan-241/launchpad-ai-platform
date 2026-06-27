import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { sendEmailWithAccount } from "@/lib/email";
import { logActivityEvent } from "@/lib/activity";
import { readStore, updateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

async function generateAIDraft(message: string): Promise<string> {
  const system = [
    "You are a senior B2B sales professional.",
    "Generate a concise, helpful reply to an inbound prospect email.",
    "Be warm, direct, and move the conversation forward.",
    "Max 3 sentences. No fluff. No placeholder text.",
    "Return ONLY the reply body — no subject line, no greeting, no signature.",
  ].join(" ");

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: `Message from prospect: "${message}"` }] }],
            generationConfig: { temperature: 0.45, maxOutputTokens: 200 },
          }),
        },
      );
      if (resp.ok) {
        const d = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch { /* fall through */ }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: "system", content: system }, { role: "user", content: `Message from prospect: "${message}"` }],
          temperature: 0.45,
          max_tokens: 200,
        }),
      });
      if (resp.ok) {
        const d = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = d.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch { /* no AI available */ }
  }

  return "Thanks for your message. I'd love to understand your situation better — would a quick call this week work for you?";
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
    const draft = await generateAIDraft(body.message?.trim() || "");
    return NextResponse.json({ draft });
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
