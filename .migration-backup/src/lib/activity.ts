import { createId, readStore, updateStore, type ActivityEvent } from "@/lib/store";

export async function logActivityEvent(input: Omit<ActivityEvent, "id" | "createdAt">) {
  const event: ActivityEvent = {
    id: createId("EVT"),
    createdAt: new Date().toISOString(),
    ...input,
  };

  await updateStore((store) => {
    store.activityEvents.unshift(event);
    store.activityEvents = store.activityEvents.slice(0, 500);
    return store;
  });

  return event;
}

export async function getActivityDashboard(userId: string) {
  const store = await readStore();
  const tasks = store.tasks.slice(0, 12);
  const jobs = store.outreachJobs.filter((job) => job.userId === userId);
  const scheduledFollowUps = jobs
    .filter((job) => job.status === "queued")
    .sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime())
    .slice(0, 12)
    .map((job) => ({
      id: job.id,
      to: job.to,
      subject: job.subject,
      sendAt: job.sendAt,
      status: job.status,
    }));

  const runningTasks = [
    ...tasks.map((task) => ({
      id: task.id,
      title: task.title,
      owner: task.owner,
      status: task.priority,
      source: "task",
      detail: `Due ${task.due}`,
    })),
    ...jobs
      .filter((job) => job.status === "queued" || job.status === "sending")
      .slice(0, 12)
      .map((job) => ({
        id: job.id,
        title: job.subject,
        owner: job.fromEmail,
        status: job.status,
        source: "outreach",
        detail: `To ${job.to}`,
      })),
  ].slice(0, 16);

  const replyThreads = store.inbox.slice(0, 10).map((message) => ({
    id: message.id,
    from: message.from,
    company: message.company,
    subject: message.subject,
    preview: message.preview,
    sentiment: message.sentiment,
    receivedAt: message.receivedAt,
  }));

  const timeline = store.activityEvents.filter((event) => event.userId === userId).slice(0, 40);
  const activeWorkflowCount = store.workflows.filter((workflow) => workflow.status === "Active").length;
  const sentCount = jobs.filter((job) => job.status === "sent").length;
  const assistantCount = timeline.filter((event) => event.type === "assistant").length;
  const projectCount = timeline.filter((event) => event.type === "project").length;
  const dealCount = store.deals.filter((deal) => deal.userId === userId).length;
  const deliveryCount = store.deliveryProjects.filter((project) => project.userId === userId).length;

  const pendingPaymentCount = store.paymentRequests.filter((p) => p.userId === userId && p.status === "awaiting_approval").length;
  const noteCount = store.deals.filter((d) => d.userId === userId).reduce((acc, d) => acc + (d.notes?.length ?? 0), 0);
  const taskCount = store.deals.filter((d) => d.userId === userId).reduce((acc, d) => acc + (d.tasks?.filter((t) => !t.done).length ?? 0), 0);

  const workers = [
    {
      name: "Dave Core",
      role: "Interprets chat commands and routes them into workspace actions.",
      status: timeline.length ? "active" : "ready",
      load: assistantCount,
    },
    {
      name: "Signal Scout",
      role: "Searches saved leads and ranks intent plus fit.",
      status: store.leads.length ? "active" : "ready",
      load: store.leads.length,
    },
    {
      name: "Sequence Forge",
      role: "Builds campaign plans, follow-up timing, and send structure.",
      status: store.campaigns.length ? "active" : "ready",
      load: store.campaigns.length,
    },
    {
      name: "Proposal Forge",
      role: "Shapes pricing-aware proposals and client-facing summaries.",
      status: projectCount || assistantCount ? "active" : "ready",
      load: projectCount,
    },
    {
      name: "Project Smith",
      role: "Generates MVP web project starter packages and previews.",
      status: projectCount ? "active" : "ready",
      load: projectCount,
    },
    {
      name: "Route Keeper",
      role: "Maintains running tasks and assigns the next best move.",
      status: runningTasks.length ? "active" : "ready",
      load: runningTasks.length,
    },
    {
      name: "Deal Keeper",
      role: "Tracks opportunity stages from lead through negotiation and win.",
      status: dealCount ? "active" : "ready",
      load: dealCount,
    },
    {
      name: "Outreach Scheduler",
      role: "Queues future follow-ups and controlled send timing.",
      status: scheduledFollowUps.length ? "active" : "ready",
      load: scheduledFollowUps.length,
    },
    {
      name: "Delivery Pilot",
      role: "Processes Gmail and Outlook sends from connected accounts.",
      status: jobs.some((job) => job.status === "sending") ? "active" : "ready",
      load: sentCount,
    },
    {
      name: "Thread Watch",
      role: "Surfaces inbound reply threads and response urgency.",
      status: replyThreads.length ? "active" : "ready",
      load: replyThreads.length,
    },
    {
      name: "Workflow Keeper",
      role: "Runs automation rules, triggers, and reminders.",
      status: activeWorkflowCount ? "active" : "ready",
      load: activeWorkflowCount,
    },
    {
      name: "Delivery Builder",
      role: "Turns won work into scoped projects and milestone plans.",
      status: deliveryCount ? "active" : "ready",
      load: deliveryCount,
    },
    {
      name: "Memory Vault",
      role: "Keeps workspace state, drafts, and timeline history persistent.",
      status: timeline.length ? "active" : "ready",
      load: timeline.length,
    },
    {
      name: "Payment Gate",
      role: "Protects pricing rules and waits for owner approval when required.",
      status: pendingPaymentCount ? "active" : "ready",
      load: pendingPaymentCount,
    },
    {
      name: "Research Worker",
      role: "Fetches live company data, cuts price to 60% when client hesitates.",
      status: assistantCount ? "active" : "ready",
      load: assistantCount,
    },
    {
      name: "Note Keeper",
      role: "Saves notes and client context to active deals from chat.",
      status: noteCount ? "active" : "ready",
      load: noteCount,
    },
    {
      name: "Task Forger",
      role: "Creates timed tasks on deals and queues follow-up reminders.",
      status: taskCount ? "active" : "ready",
      load: taskCount,
    },
    {
      name: "CSV Importer",
      role: "Ingests bulk lead lists from CSV files and deduplicates records.",
      status: store.leads.length > 5 ? "active" : "ready",
      load: store.leads.length,
    },
    {
      name: "Inactivity Guard",
      role: "Monitors owner presence and auto-prepares payment links after 30 min idle.",
      status: pendingPaymentCount ? "active" : "ready",
      load: pendingPaymentCount,
    },
    {
      name: "Pricing Analyst",
      role: "Applies discount rules, part-payment logic, and currency preferences.",
      status: "active",
      load: assistantCount,
    },
  ];

  return {
    workers,
    runningTasks,
    scheduledFollowUps,
    replyThreads,
    timeline,
  };
}
