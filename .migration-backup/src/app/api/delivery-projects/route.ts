import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { createDeliveryProject } from "@/lib/crm";
import { readStore } from "@/lib/store";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const store = await readStore();
    return NextResponse.json({ projects: store.deliveryProjects.filter((item) => item.userId === user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      clientName?: string;
      clientEmail?: string;
      scope?: string;
      dealId?: string;
      acceptanceRequired?: boolean;
    };
    if (!body.title || !body.clientName || !body.clientEmail || !body.scope) {
      throw new Error("Title, client name, client email, and scope are required.");
    }
    const project = await createDeliveryProject({
      user,
      title: body.title,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      scope: body.scope,
      dealId: body.dealId,
      acceptanceRequired: body.acceptanceRequired,
    });
    return NextResponse.json({ ok: true, message: "Delivery project created.", project });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create delivery project." }, { status: 400 });
  }
}
