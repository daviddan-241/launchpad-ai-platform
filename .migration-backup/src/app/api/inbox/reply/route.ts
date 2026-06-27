import { NextResponse } from "next/server";

function draftReply(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("timing") || lower.includes("next month") || lower.includes("later")) {
    return "Totally fair. I’ll keep this light for now and follow up when timing is better. In the meantime, I can send a short checklist your team can use so you already have the playbook when you’re ready.";
  }

  if (lower.includes("price") || lower.includes("budget") || lower.includes("cost")) {
    return "Happy to break down the value clearly. Since this build is free-first, I’d focus on the workflows that reduce manual prospecting, improve routing, and help your reps book more meetings without adding more tools.";
  }

  if (lower.includes("salesforce") || lower.includes("crm") || lower.includes("hubspot")) {
    return "Yes — the best setup is to sync only the fields that matter, apply dedupe rules first, and push updates back to the CRM in a controlled way so reps always see fresh records instead of duplicates.";
  }

  return "Thanks for the note. Based on what you shared, I’d tailor the workflow around your current process, keep the rollout simple, and focus first on the fastest path to more qualified conversations. If helpful, I can outline the exact next steps for your team.";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { message?: string };
  const message = body.message?.trim() || "";
  return NextResponse.json({ draft: draftReply(message) });
}
