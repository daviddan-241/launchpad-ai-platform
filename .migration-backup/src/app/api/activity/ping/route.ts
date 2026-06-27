import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { processInactivePaymentDrafts } from "@/lib/payments";
import { updateStore } from "@/lib/store";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    await updateStore((store) => {
      const target = store.users.find((item) => item.id === user.id);
      if (target) target.lastSeenAt = new Date().toISOString();
      return store;
    });
    await processInactivePaymentDrafts();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
