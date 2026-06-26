import { AgentConsole } from "@/components/agent-console";
import { getActivityDashboard } from "@/lib/activity";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const user = await requireCurrentUser();
  const snapshot = await getActivityDashboard(user.id);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Automation lab</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Internal automation engine</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          All workers run on the server continuously. Outreach fires every 60 seconds. Inbox polls every 5 minutes. Auto-payment triggers after 30 minutes idle.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-2 text-xs text-slate-300">
            Active: <span className="font-semibold text-amber-200">{snapshot.workers.filter((w) => w.status === "active").length}</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-2 text-xs text-slate-300">
            Ready: <span className="font-semibold text-slate-200">{snapshot.workers.filter((w) => w.status === "ready").length}</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#161022] px-4 py-2 text-xs text-slate-300">
            Queued jobs: <span className="font-semibold text-fuchsia-200">{snapshot.scheduledFollowUps.length}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {snapshot.workers.map((worker) => (
          <div key={worker.name} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">{worker.name}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  worker.status === "active"
                    ? "border border-amber-400/20 bg-amber-400/10 text-amber-100"
                    : "border border-white/10 bg-white/5 text-slate-400"
                }`}
              >
                {worker.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{worker.role}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-fuchsia-300">Load</span>
              <span className="text-xs font-medium text-white">{worker.load}</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-fuchsia-400/60 transition-all"
                style={{ width: `${Math.min(100, worker.load * 4 + (worker.status === "active" ? 15 : 3))}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Running tasks</p>
          <div className="mt-4 space-y-3">
            {snapshot.runningTasks.length ? (
              snapshot.runningTasks.map((task) => (
                <div key={task.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-400">{task.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{task.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No active tasks. Run a chat command to start the engine.</p>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Scheduled follow-ups</p>
          <div className="mt-4 space-y-3">
            {snapshot.scheduledFollowUps.length ? (
              snapshot.scheduledFollowUps.map((job) => (
                <div key={job.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
                  <p className="text-sm font-medium text-white">{job.subject}</p>
                  <p className="mt-1 text-xs text-slate-400">To {job.to}</p>
                  <p className="mt-1 text-xs text-amber-300">{new Date(job.sendAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No queued follow-ups. Use chat: "follow up in 20 minutes".</p>
            )}
          </div>
        </section>
      </div>

      <AgentConsole />
    </div>
  );
}
