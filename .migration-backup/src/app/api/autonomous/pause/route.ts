import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { updateStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { id, action } = (await request.json().catch(() => ({}))) as { id?: string; action?: "pause" | "resume" | "stop" };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await updateStore((draft) => {
      const c = draft.autonomousCampaigns?.find((x) => x.id === id && x.userId === user.id);
      if (c) {
        if (action === "pause") c.status = "paused";
        else if (action === "resume") c.status = "running";
        else if (action === "stop") c.status = "completed";
        c.updatedAt = new Date().toISOString();
      }
      return draft;
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
