import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { generateProject } from "@/lib/project-generator";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as { prompt?: string };
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Project prompt is required." }, { status: 400 });
    }

    const project = generateProject(prompt);
    await logActivityEvent({
      userId: user.id,
      type: "project",
      title: `Generated project ${project.title}`,
      detail: prompt,
      status: "done",
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate project." },
      { status: 500 },
    );
  }
}
