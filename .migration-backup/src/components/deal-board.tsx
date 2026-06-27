"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DealNote = { id: string; content: string; createdAt: string };
type DealTask = { id: string; title: string; dueAt?: string; done: boolean; createdAt: string };

type Deal = {
  id: string;
  clientName: string;
  clientEmail: string;
  company: string;
  value: number;
  currency: string;
  stage: "Lead" | "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";
  description: string;
  nextAction?: string;
  notes?: DealNote[];
  tasks?: DealTask[];
};

const stages: Deal["stage"][] = ["Lead", "Discovery", "Proposal", "Negotiation", "Won", "Lost"];

function DealCard({ deal, onMove, busy }: { deal: Deal; onMove: (s: Deal["stage"]) => void; busy: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [taskText, setTaskText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<DealNote[]>(deal.notes ?? []);
  const [tasks, setTasks] = useState<DealTask[]>(deal.tasks ?? []);
  const router = useRouter();

  async function saveNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    const res = await fetch("/api/deals/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: deal.id, type: "note", content: noteText }),
    });
    const data = await res.json() as { note?: DealNote };
    if (data.note) setNotes((prev) => [data.note!, ...prev]);
    setNoteText("");
    setSaving(false);
  }

  async function saveTask() {
    if (!taskText.trim()) return;
    setSaving(true);
    const res = await fetch("/api/deals/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: deal.id, type: "task", content: taskText }),
    });
    const data = await res.json() as { task?: DealTask };
    if (data.task) setTasks((prev) => [data.task!, ...prev]);
    setTaskText("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-[#161022] p-4">
      <p className="font-medium text-white">{deal.clientName}</p>
      <p className="mt-1 text-sm text-slate-400">{deal.company}</p>
      <p className="mt-2 text-sm text-slate-300">{deal.currency} {deal.value}</p>
      <p className="mt-2 text-xs text-slate-500">{deal.nextAction || deal.description}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {stages.filter((s) => s !== deal.stage).slice(0, 3).map((next) => (
          <button key={next} onClick={() => onMove(next)} disabled={busy} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-300 hover:bg-white/5 disabled:opacity-70">
            Move to {next}
          </button>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] text-fuchsia-200 hover:bg-fuchsia-400/20"
        >
          {expanded ? "Hide" : `Notes${notes.length ? ` (${notes.length})` : ""} / Tasks${tasks.length ? ` (${tasks.filter((t) => !t.done).length})` : ""}`}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Notes</p>
            <div className="mt-2 flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveNote()}
                placeholder="Add a note..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400/40"
              />
              <button onClick={saveNote} disabled={saving || !noteText.trim()} className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">
                Save
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-white/8 bg-white/3 p-3">
                  <p className="text-xs text-slate-200">{note.content}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{new Date(note.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {!notes.length && <p className="text-xs text-slate-500">No notes yet.</p>}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tasks</p>
            <div className="mt-2 flex gap-2">
              <input
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveTask()}
                placeholder="Add a task..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400/40"
              />
              <button onClick={saveTask} disabled={saving || !taskText.trim()} className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">
                Add
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className={`rounded-2xl border border-white/8 bg-white/3 p-3 ${task.done ? "opacity-50" : ""}`}>
                  <p className="text-xs text-slate-200">{task.title}</p>
                  {task.dueAt && <p className="mt-1 text-[10px] text-amber-300">Due {new Date(task.dueAt).toLocaleString()}</p>}
                </div>
              ))}
              {!tasks.length && <p className="text-xs text-slate-500">No tasks yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DealBoard({ deals }: { deals: Deal[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function move(dealId: string, stage: Deal["stage"]) {
    setBusyId(dealId);
    await fetch("/api/deals/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId, stage }),
    });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
      {stages.map((stage) => (
        <section key={stage} className="rounded-[30px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{stage}</h2>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">{deals.filter((deal) => deal.stage === stage).length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {deals.filter((deal) => deal.stage === stage).map((deal) => (
              <DealCard key={deal.id} deal={deal} onMove={(s) => move(deal.id, s)} busy={busyId === deal.id} />
            ))}
            {!deals.some((deal) => deal.stage === stage) && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#161022] p-4 text-sm text-slate-500">No deals here.</div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
