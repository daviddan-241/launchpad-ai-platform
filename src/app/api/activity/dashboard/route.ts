import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getActivityDashboard } from "@/lib/activity";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const snapshot = await getActivityDashboard(user.id);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
