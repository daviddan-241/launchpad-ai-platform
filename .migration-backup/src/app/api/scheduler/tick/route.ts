import { NextResponse } from "next/server";
import { runAllWorkerTasks } from "@/lib/workers";

export async function GET(request: Request) {
  const secret = process.env.SCHEDULER_SECRET;
  if (secret) {
    const auth = request.headers.get("x-scheduler-secret") ?? new URL(request.url).searchParams.get("secret");
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const start = Date.now();
  await runAllWorkerTasks();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ms: Date.now() - start });
}

export async function POST(request: Request) {
  return GET(request);
}
