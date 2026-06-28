import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await readStore();
  const portfolio = (store.portfolios ?? []).find((p) => p.id === id);
  if (!portfolio) {
    return new NextResponse("<h1>Portfolio not found</h1>", { status: 404, headers: { "Content-Type": "text/html" } });
  }
  return new NextResponse(portfolio.html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
