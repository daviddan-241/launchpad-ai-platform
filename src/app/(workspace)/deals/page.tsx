import { DealBoard } from "@/components/deal-board";
import { DealForm } from "@/components/deal-form";
import { requireCurrentUser } from "@/lib/auth";
import { getCrmSnapshot } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const user = await requireCurrentUser();
  const { deals } = await getCrmSnapshot(user.id);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Deals</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Opportunity pipeline</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Manage client opportunities from first lead through proposal, negotiation, and win/loss.
        </p>
      </section>

      <DealForm />
      <DealBoard deals={deals} />
    </div>
  );
}
