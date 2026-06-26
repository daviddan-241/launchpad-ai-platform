import { Router, type IRouter } from "express";
import { db, agentTasksTable, scheduledJobsTable, emailRepliesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { parseAgentCommand, executeAgentPlan } from "../lib/agent";

const router: IRouter = Router();

// Execute a natural language command
router.post("/agent/command", async (req, res): Promise<void> => {
  try {
    const { command, sessionId } = req.body;
    if (!command?.trim()) { res.status(400).json({ error: "command required" }); return; }

    // Parse the command into a plan
    const plan = await parseAgentCommand(command);

    // Create task record
    const [task] = await db.insert(agentTasksTable).values({
      command: command.trim(),
      status: "running",
      plan,
      progress: [{ step: `🧠 Understood: ${plan.intent}`, status: "done", time: new Date().toISOString() }],
      sessionId: sessionId ?? null,
    }).returning();

    // Run in background (don't await)
    executeAgentPlan(task.id, plan).catch(err => {
      req.log.error({ err }, "agent task failed");
    });

    res.json({ taskId: task.id, plan });
  } catch (err) {
    req.log.error({ err }, "agent command failed");
    res.status(500).json({ error: "Failed to execute command" });
  }
});

// Get task status (for polling)
router.get("/agent/tasks/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [task] = await db.select().from(agentTasksTable).where(eq(agentTasksTable.id, id));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json({
      ...task,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt?.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "get task failed");
    res.status(500).json({ error: "Failed to get task" });
  }
});

// List recent tasks
router.get("/agent/tasks", async (req, res): Promise<void> => {
  try {
    const tasks = await db.select().from(agentTasksTable).orderBy(desc(agentTasksTable.createdAt)).limit(20);
    res.json(tasks.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt?.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "list tasks failed");
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

// Get scheduled jobs
router.get("/agent/jobs", async (req, res): Promise<void> => {
  try {
    const jobs = await db.select().from(scheduledJobsTable).orderBy(desc(scheduledJobsTable.createdAt)).limit(50);
    res.json(jobs.map(j => ({
      ...j,
      runAt: j.runAt.toISOString(),
      ranAt: j.ranAt?.toISOString() ?? null,
      createdAt: j.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "list jobs failed");
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

// Get email replies
router.get("/agent/replies", async (req, res): Promise<void> => {
  try {
    const replies = await db.select().from(emailRepliesTable).orderBy(desc(emailRepliesTable.createdAt)).limit(50);
    res.json(replies.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      repliedAt: r.repliedAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "list replies failed");
    res.status(500).json({ error: "Failed to list replies" });
  }
});

export default router;
