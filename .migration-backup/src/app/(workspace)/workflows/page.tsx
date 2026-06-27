import { CreateWorkflowForm } from "@/components/create-workflow-form";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const store = await readStore();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Workflows</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Automation builder</h1>
      </section>

      <CreateWorkflowForm />

      <section className="grid gap-5 lg:grid-cols-3">
        {store.workflows.map((workflow) => (
          <div key={workflow.id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-lg font-semibold text-white">{workflow.name}</p>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{workflow.status}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">Trigger: {workflow.trigger}</p>
            <div className="mt-5 space-y-3">
              {workflow.actions.map((action, index) => (
                <div key={action} className="rounded-3xl border border-white/8 bg-[#161022] p-4 text-sm text-slate-200">
                  <span className="mr-2 text-fuchsia-300">{index + 1}.</span>
                  {action}
                </div>
              ))}
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-fuchsia-300" style={{ width: `${workflow.successRate}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-400">{workflow.successRate}% success rate</p>
          </div>
        ))}
      </section>
    </div>
  );
}
