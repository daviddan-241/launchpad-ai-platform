import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { createId, readStore, updateStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ workflows: store.workflows });
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      trigger?: string;
      actions?: string;
    };

    const name = body.name?.trim();
    const trigger = body.trigger?.trim();
    const actions = (body.actions ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name || !trigger || actions.length === 0) {
      throw new Error("Name, trigger, and at least one action are required.");
    }

    let created = null;
    await updateStore((store) => {
      created = {
        id: createId("WF"),
        name,
        trigger,
        actions,
        status: "Draft" as const,
        successRate: 0,
      };
      store.workflows.unshift(created);
      return store;
    });

    await logActivityEvent({
      userId: user.id,
      type: "workflow",
      title: `Created workflow ${name}`,
      detail: `Trigger: ${trigger}`,
      status: "done",
    });

    return NextResponse.json({ ok: true, workflow: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create workflow." },
      { status: 400 },
    );
  }
}
