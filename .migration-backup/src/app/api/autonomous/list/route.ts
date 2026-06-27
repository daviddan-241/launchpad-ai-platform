import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const store = await readStore();
    const campaigns = (store.autonomousCampaigns ?? []).filter((c) => c.userId === user.id);
    return NextResponse.json({ campaigns });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
