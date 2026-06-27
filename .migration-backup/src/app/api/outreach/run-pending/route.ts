import { NextResponse } from "next/server";
import { bootstrapOutreachWorker, processDueOutreachJobs } from "@/lib/outreach";

export async function POST(request: Request) {
  bootstrapOutreachWorker();
  const count = await processDueOutreachJobs();

  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/campaigns", request.url));
  }

  return NextResponse.json({ ok: true, processed: count });
}
