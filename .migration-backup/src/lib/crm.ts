import { logActivityEvent } from "@/lib/activity";
import { createId, readStore, updateStore, type Deal, type DealNote, type DealStage, type DealTask, type DeliveryMilestone, type DeliveryProject, type User } from "@/lib/store";
import { getUserPreference } from "@/lib/preferences";

export async function createDeal(params: {
  user: User;
  clientName: string;
  clientEmail: string;
  company: string;
  value?: number;
  currency?: string;
  description: string;
  leadId?: string;
  nextAction?: string;
}) {
  const pref = await getUserPreference(params.user.id);
  const deal: Deal = {
    id: createId("DEAL"),
    userId: params.user.id,
    leadId: params.leadId,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    company: params.company,
    value: params.value ?? pref.starterPrice,
    currency: params.currency ?? pref.currency,
    stage: "Lead",
    description: params.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nextAction: params.nextAction,
  };

  await updateStore((store) => {
    store.deals.unshift(deal);
    return store;
  });

  await logActivityEvent({
    userId: params.user.id,
    type: "deal",
    title: `Created deal for ${params.clientName}`,
    detail: `${deal.company} · ${deal.currency} ${deal.value}`,
    status: "done",
  });

  return deal;
}

export async function moveDealStage(params: { user: User; dealId: string; stage: DealStage; nextAction?: string }) {
  let updated: Deal | null = null;
  await updateStore((store) => {
    const deal = store.deals.find((item) => item.id === params.dealId && item.userId === params.user.id);
    if (!deal) throw new Error("Deal not found.");
    deal.stage = params.stage;
    deal.updatedAt = new Date().toISOString();
    if (params.nextAction !== undefined) deal.nextAction = params.nextAction;
    updated = { ...deal };
    return store;
  });

  const movedDeal = updated as Deal | null;

  await logActivityEvent({
    userId: params.user.id,
    type: "deal",
    title: `Moved deal to ${params.stage}`,
    detail: movedDeal ? `${movedDeal.clientName} · ${movedDeal.company}` : params.dealId,
    status: "done",
  });

  return movedDeal;
}

export async function createDeliveryProject(params: {
  user: User;
  title: string;
  clientName: string;
  clientEmail: string;
  scope: string;
  dealId?: string;
  acceptanceRequired?: boolean;
}) {
  const project: DeliveryProject = {
    id: createId("PRJ"),
    userId: params.user.id,
    dealId: params.dealId,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    title: params.title,
    scope: params.scope,
    status: "Planning",
    acceptanceRequired: params.acceptanceRequired ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [],
  };

  await updateStore((store) => {
    store.deliveryProjects.unshift(project);
    return store;
  });

  await logActivityEvent({
    userId: params.user.id,
    type: "delivery",
    title: `Created delivery project ${params.title}`,
    detail: `${params.clientName} · ${params.clientEmail}`,
    status: "done",
  });

  return project;
}

export async function addMilestone(params: {
  user: User;
  projectId: string;
  title: string;
  due?: string;
  notes?: string;
}) {
  const milestone: DeliveryMilestone = {
    id: createId("MS"),
    title: params.title,
    due: params.due,
    notes: params.notes,
    status: "Planned",
  };

  await updateStore((store) => {
    const project = store.deliveryProjects.find((item) => item.id === params.projectId && item.userId === params.user.id);
    if (!project) throw new Error("Project not found.");
    project.milestones.push(milestone);
    project.updatedAt = new Date().toISOString();
    return store;
  });

  await logActivityEvent({
    userId: params.user.id,
    type: "delivery",
    title: `Added milestone ${params.title}`,
    detail: params.projectId,
    status: "done",
  });

  return milestone;
}

export async function addDealNote(params: { user: User; dealId: string; content: string }) {
  const note: DealNote = {
    id: createId("NOTE"),
    dealId: params.dealId,
    userId: params.user.id,
    content: params.content.trim(),
    createdAt: new Date().toISOString(),
  };

  await updateStore((store) => {
    const deal = store.deals.find((item) => item.id === params.dealId && item.userId === params.user.id);
    if (!deal) throw new Error("Deal not found.");
    if (!deal.notes) deal.notes = [];
    deal.notes.unshift(note);
    deal.updatedAt = new Date().toISOString();
    return store;
  });

  await logActivityEvent({
    userId: params.user.id,
    type: "deal",
    title: `Note added to deal`,
    detail: params.content.slice(0, 80),
    status: "done",
  });

  return note;
}

export async function addDealTask(params: { user: User; dealId: string; title: string; dueAt?: string }) {
  const task: DealTask = {
    id: createId("DTSK"),
    dealId: params.dealId,
    userId: params.user.id,
    title: params.title.trim(),
    dueAt: params.dueAt,
    done: false,
    createdAt: new Date().toISOString(),
  };

  await updateStore((store) => {
    const deal = store.deals.find((item) => item.id === params.dealId && item.userId === params.user.id);
    if (!deal) throw new Error("Deal not found.");
    if (!deal.tasks) deal.tasks = [];
    deal.tasks.unshift(task);
    deal.updatedAt = new Date().toISOString();
    return store;
  });

  await logActivityEvent({
    userId: params.user.id,
    type: "deal",
    title: `Task added: ${params.title}`,
    detail: params.dueAt ? `Due ${params.dueAt}` : "No deadline set",
    status: "done",
  });

  return task;
}

export async function completeDealTask(params: { user: User; taskId: string }) {
  await updateStore((store) => {
    for (const deal of store.deals) {
      if (deal.userId !== params.user.id) continue;
      const task = deal.tasks?.find((t) => t.id === params.taskId);
      if (task) {
        task.done = true;
        deal.updatedAt = new Date().toISOString();
        break;
      }
    }
    return store;
  });
}

export async function getCrmSnapshot(userId: string) {
  const store = await readStore();
  const deals = store.deals.filter((item) => item.userId === userId);
  const projects = store.deliveryProjects.filter((item) => item.userId === userId);
  return { deals, projects };
}
