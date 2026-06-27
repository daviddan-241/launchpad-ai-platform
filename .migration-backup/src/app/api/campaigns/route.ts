import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { createId, readStore, updateStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ campaigns: store.campaigns });
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      audience?: string;
      objective?: string;
      channelMix?: string[];
    };

    const name = body.name?.trim();
    const audience = body.audience?.trim();
    const objective = body.objective?.trim();
    const channelMix = Array.isArray(body.channelMix)
      ? body.channelMix.map((item) => item.trim()).filter(Boolean)
      : [];

    if (!name || !audience || !objective) {
      throw new Error("Name, audience, and objective are required.");
    }

    let created = null;
    await updateStore((store) => {
      created = {
        id: createId("CP"),
        name,
        audience,
        objective,
        channelMix: channelMix.length ? channelMix : ["Email"],
        status: "Draft" as const,
        openRate: 0,
        replyRate: 0,
        meetings: 0,
        leads: 0,
      };
      store.campaigns.unshift(created);
      return store;
    });

    await logActivityEvent({
      userId: user.id,
      type: "campaign",
      title: `Created campaign ${name}`,
      detail: `${audience} · ${objective}`,
      status: "done",
    });

    return NextResponse.json({ ok: true, campaign: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create campaign." },
      { status: 400 },
    );
  }
}
