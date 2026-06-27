import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const store = await readStore();
    const accounts = store.emailAccounts
      .filter((account) => account.userId === user.id)
      .map(({ id, provider, email, connectedAt, updatedAt }) => ({ id, provider, email, connectedAt, updatedAt }));

    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
