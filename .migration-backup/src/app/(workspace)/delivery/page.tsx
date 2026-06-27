import { DeliveryProjectForm } from "@/components/delivery-project-form";
import { DeliveryProjectList } from "@/components/delivery-project-list";
import { requireCurrentUser } from "@/lib/auth";
import { getCrmSnapshot } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  const user = await requireCurrentUser();
  const { deals, projects } = await getCrmSnapshot(user.id);
  const dealOptions = deals.map((deal) => ({ id: deal.id, clientName: deal.clientName, company: deal.company, clientEmail: deal.clientEmail }));

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Delivery</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Project handoff and milestones</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Convert won deals into delivery projects, track milestones, and keep acceptance requirements visible.
        </p>
      </section>

      <DeliveryProjectForm deals={dealOptions} />
      <DeliveryProjectList projects={projects} />
    </div>
  );
}
