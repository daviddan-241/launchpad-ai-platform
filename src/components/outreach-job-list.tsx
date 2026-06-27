import type { OutreachJob } from "@/lib/store";

export function OutreachJobList({ jobs }: { jobs: OutreachJob[] }) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300">Outreach jobs</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Send queue and delivery log</h2>
        </div>
        <form action="/api/outreach/run-pending" method="post">
          <button type="submit" className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5">
            Run due jobs now
          </button>
        </form>
      </div>

      <div className="mt-4 space-y-3">
        {jobs.length ? (
          jobs.map((job) => (
            <div key={job.id} className="rounded-3xl border border-white/8 bg-[#161022] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{job.subject}</p>
                  <p className="mt-1 text-sm text-slate-400">{job.fromEmail} → {job.to}</p>
                  <p className="mt-2 text-xs text-slate-500">Send at: {new Date(job.sendAt).toLocaleString()}</p>
                  {job.error ? <p className="mt-2 text-xs text-rose-300">{job.error}</p> : null}
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{job.status}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-400">
            No outreach jobs created yet.
          </div>
        )}
      </div>
    </section>
  );
}
