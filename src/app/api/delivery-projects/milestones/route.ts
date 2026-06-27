import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { addMilestone } from "@/lib/crm";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { projectId?: string; title?: string; due?: string; notes?: string };
    if (!body.projectId || !body.title) throw new Error("Project id and milestone title are required.");
    const milestone = await addMilestone({
      user,
      projectId: body.projectId,
      title: body.title,
      due: body.due,
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, milestone });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add milestone." }, { status: 400 });
  }
}
