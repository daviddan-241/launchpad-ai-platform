import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireCurrentUser();
    const store = await readStore();
    return NextResponse.json({ inbox: store.inbox.slice(0, 100) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
