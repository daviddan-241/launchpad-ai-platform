import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { addDealNote, addDealTask } from "@/lib/crm";
import { readStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const dealId = request.nextUrl.searchParams.get("dealId");
    if (!dealId) return NextResponse.json({ error: "dealId is required" }, { status: 400 });

    const store = await readStore();
    const deal = store.deals.find((d) => d.id === dealId && d.userId === user.id);
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

    return NextResponse.json({ notes: deal.notes ?? [], tasks: deal.tasks ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      dealId?: string;
      content?: string;
      type?: "note" | "task";
      dueAt?: string;
    };

    if (!body.dealId) return NextResponse.json({ error: "dealId is required" }, { status: 400 });

    if (body.type === "task") {
      if (!body.content?.trim()) return NextResponse.json({ error: "Task title is required" }, { status: 400 });
      const task = await addDealTask({ user, dealId: body.dealId, title: body.content, dueAt: body.dueAt });
      return NextResponse.json({ ok: true, task });
    }

    if (!body.content?.trim()) return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    const note = await addDealNote({ user, dealId: body.dealId, content: body.content });
    return NextResponse.json({ ok: true, note });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save note." }, { status: 400 });
  }
}
