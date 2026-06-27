import { NextRequest, NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";
import { createId, readStore, updateStore } from "@/lib/store";

const CSV_HEADERS = ["name", "title", "company", "industry", "region", "email", "companySize", "tags", "painPoints", "nextStep", "recentSignal", "fitScore", "intentScore"];

function escapeCell(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    const store = await readStore();
    const rows = [
      CSV_HEADERS.join(","),
      ...store.leads.map((lead) =>
        [
          lead.name,
          lead.title,
          lead.company,
          lead.industry,
          lead.region,
          lead.email,
          lead.companySize,
          (lead.tags ?? []).join(";"),
          (lead.painPoints ?? []).join(";"),
          lead.nextStep,
          lead.recentSignal,
          lead.fitScore,
          lead.intentScore,
        ]
          .map(escapeCell)
          .join(","),
      ),
    ];

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leadforge-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const text = await request.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ error: "CSV must have a header row and at least one data row." }, { status: 400 });

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(",").map((h: string) => h.trim().replace(/^"|"$/g, ""));

    const idx = (name: string) => headers.indexOf(name);

    const imported: string[] = [];
    const skipped: string[] = [];

    await updateStore((store) => {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].match(/(?:"[^"]*(?:""[^"]*)*"|[^,]*)/g)?.map((c: string) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];

        const name = cols[idx("name")]?.trim();
        const email = cols[idx("email")]?.trim();
        if (!name || !email) {
          skipped.push(`Row ${i + 1}: missing name or email`);
          continue;
        }

        if (store.leads.some((l) => l.email.toLowerCase() === email.toLowerCase())) {
          skipped.push(`Row ${i + 1}: ${email} already exists`);
          continue;
        }

        const lead = {
          id: createId("LD"),
          name,
          title: cols[idx("title")] || "Unknown",
          company: cols[idx("company")] || "Unknown",
          industry: cols[idx("industry")] || "General",
          companySize: cols[idx("companysize")] || cols[idx("company_size")] || "Unknown",
          region: cols[idx("region")] || "Unknown",
          email,
          linkedin: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, "-")}`,
          fitScore: Number(cols[idx("fitscore")] || cols[idx("fit_score")] || 70),
          intentScore: Number(cols[idx("intentscore")] || cols[idx("intent_score")] || 60),
          stage: "New" as const,
          nextStep: cols[idx("nextstep")] || cols[idx("next_step")] || "Review and enrich",
          tags: (cols[idx("tags")] || "").split(";").map((t: string) => t.trim()).filter(Boolean),
          painPoints: (cols[idx("painpoints")] || cols[idx("pain_points")] || "").split(";").map((t: string) => t.trim()).filter(Boolean),
          recentSignal: cols[idx("recentsignal")] || cols[idx("recent_signal")] || `Imported ${new Date().toLocaleDateString()}`,
          lastTouched: "just now",
        };

        store.leads.unshift(lead);
        imported.push(name);
      }
      return store;
    });

    await logActivityEvent({
      userId: user.id,
      type: "lead",
      title: `CSV import: ${imported.length} leads added`,
      detail: skipped.length ? `Skipped ${skipped.length} rows` : "All rows imported.",
      status: "done",
    });

    return NextResponse.json({ ok: true, imported: imported.length, skipped, names: imported });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 400 });
  }
}
