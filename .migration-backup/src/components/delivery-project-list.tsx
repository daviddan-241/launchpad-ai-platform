"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Milestone = { id: string; title: string; due?: string; status: string; notes?: string };
type Project = { id: string; title: string; clientName: string; clientEmail: string; scope: string; status: string; acceptanceRequired: boolean; milestones: Milestone[] };

export function DeliveryProjectList({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function addMilestone(projectId: string) {
    const title = drafts[projectId]?.trim();
    if (!title) return;
    setBusyId(projectId);
    await fetch("/api/delivery-projects/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title }),
    });
    setBusyId(null);
    setDrafts((s) => ({ ...s, [projectId]: "" }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {projects.length ? projects.map((project) => (
        <section key={project.id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">{project.title}</p>
              <p className="mt-1 text-sm text-slate-400">{project.clientName} · {project.clientEmail}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{project.scope}</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{project.status}</span>
          </div>
          <div className="mt-4 rounded-3xl border border-white/8 bg-[#161022] p-4">
            <p className="text-sm font-medium text-white">Milestones</p>
            <div className="mt-3 space-y-3">
              {project.milestones.length ? project.milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-2xl border border-white/8 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white">{milestone.title}</p>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-300">{milestone.status}</span>
                  </div>
                  {milestone.notes ? <p className="mt-2 text-xs text-slate-400">{milestone.notes}</p> : null}
                </div>
              )) : <div className="rounded-2xl border border-dashed border-white/10 p-3 text-sm text-slate-500">No milestones yet.</div>}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input value={drafts[project.id] || ""} onChange={(e)=>setDrafts((s)=>({...s, [project.id]: e.target.value}))} placeholder="New milestone title" className="w-full rounded-2xl border border-white/10 bg-[#0f0b17] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-300/40" />
              <button onClick={() => addMilestone(project.id)} disabled={busyId === project.id} className="rounded-2xl bg-fuchsia-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-70">Add milestone</button>
            </div>
          </div>
        </section>
      )) : <div className="rounded-[30px] border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">No delivery projects yet.</div>}
    </div>
  );
}
