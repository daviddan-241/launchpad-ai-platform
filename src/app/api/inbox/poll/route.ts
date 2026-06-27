import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { pollInboxForReplies } from "@/lib/imap";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireCurrentUser();
    const result = await pollInboxForReplies();
    return NextResponse.json({ ok: true, newMessages: result.newMessages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Poll failed." },
      { status: 400 },
    );
  }
}

export async function GET() {
  return POST();
}
