import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { runAssistantCommand } from "@/lib/assistant";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { prompt?: string };
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "A command prompt is required." }, { status: 400 });
    }

    const result = await runAssistantCommand(prompt, user);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process command.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
