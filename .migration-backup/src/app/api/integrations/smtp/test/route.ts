import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { sendEmailWithAccount } from "@/lib/email";
import { readStore } from "@/lib/store";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const store = await readStore();
    const account = store.emailAccounts.find((item) => item.userId === user.id && item.provider === "smtp");
    if (!account) {
      throw new Error("No SMTP sender account found.");
    }

    await sendEmailWithAccount({
      accountId: account.id,
      to: account.email,
      subject: "LeadForge SMTP test",
      text: "This is a real SMTP test email from your LeadForge workspace.",
      html: "<p>This is a real SMTP test email from your <strong>LeadForge</strong> workspace.</p>",
    });

    return NextResponse.json({ ok: true, message: `SMTP test email sent to ${account.email}.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SMTP test failed." }, { status: 400 });
  }
}
