import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { bootstrapAllWorkers } from "@/lib/workers";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  bootstrapAllWorkers();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const store = await readStore();
  const dealPipeline = store.deals
    .filter((d) => d.userId === user.id && d.stage !== "Lost")
    .reduce((sum, d) => sum + d.value, 0);
  const paymentPipeline = store.paymentRequests
    .filter((p) => p.userId === user.id && (p.status === "awaiting_approval" || p.status === "link_ready" || p.status === "sent"))
    .reduce((sum, p) => sum + p.amount, 0);
  const pipelineValue = dealPipeline + paymentPipeline;

  return <AppShell user={user} pipelineValue={pipelineValue}>{children}</AppShell>;
}
