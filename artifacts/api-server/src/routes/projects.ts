import { Router, type IRouter } from "express";
import { db, projectsTable, activityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateText } from "../lib/ai";
import { Octokit } from "@octokit/rest";

const router: IRouter = Router();

function serializeProject(p: typeof projectsTable.$inferSelect) {
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt?.toISOString() ?? null };
}

router.get("/projects", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
    res.json(rows.map(serializeProject));
  } catch (err) {
    req.log.error({ err }, "list projects failed");
    res.status(500).json({ error: "Failed to list projects" });
  }
});

router.post("/projects", async (req, res): Promise<void> => {
  try {
    const { name, description, techStack, targetAudience, estimatedCost, estimatedTimeline } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const [project] = await db.insert(projectsTable).values({
      name, description, techStack, targetAudience,
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      estimatedTimeline,
    }).returning();
    res.status(201).json(serializeProject(project));
  } catch (err) {
    req.log.error({ err }, "create project failed");
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    res.json(serializeProject(project));
  } catch (err) {
    req.log.error({ err }, "get project failed");
    res.status(500).json({ error: "Failed to get project" });
  }
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [project] = await db.update(projectsTable).set(req.body).where(eq(projectsTable.id, id)).returning();
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    res.json(serializeProject(project));
  } catch (err) {
    req.log.error({ err }, "update project failed");
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "delete project failed");
    res.status(500).json({ error: "Failed to delete project" });
  }
});

router.post("/projects/:id/generate", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const prompt = `Generate a complete MVP web application for: "${project.name}"
Description: ${project.description ?? "A modern web application"}
Tech Stack: ${project.techStack ?? "HTML, CSS, JavaScript"}
Target Audience: ${project.targetAudience ?? "General users"}

Create a complete, working single-file HTML application with:
1. A professional landing page with header, hero section, features, pricing, and footer
2. Inline CSS with modern design (dark theme, gradient accents)
3. Working JavaScript interactions
4. Mobile responsive
5. All real placeholder content specific to this project

Return ONLY the complete HTML file content, no markdown fences.`;

    const generatedCode = await generateText(prompt, "You are a senior full-stack developer. Generate complete, working, beautiful web application code.");

    // Generate proposal JSON
    const proposalPrompt = `Create a professional project proposal for "${project.name}".
Description: ${project.description ?? ""}
Tech Stack: ${project.techStack ?? "Modern web stack"}
Target Audience: ${project.targetAudience ?? "Businesses"}
Estimated Cost: $${project.estimatedCost ?? 5000}
Timeline: ${project.estimatedTimeline ?? "4-6 weeks"}

Return ONLY valid JSON: {
  "executiveSummary": "...",
  "features": ["feature1","feature2","feature3","feature4","feature5"],
  "techStack": ["tech1","tech2","tech3"],
  "timeline": "...",
  "pricing": "...",
  "termsAndConditions": "..."
}`;

    const proposalRaw = await generateText(proposalPrompt, "You are a professional business consultant. Return only valid JSON.");
    let proposalData = {
      executiveSummary: `This proposal outlines the development of ${project.name}.`,
      features: ["User authentication", "Dashboard", "API integration", "Mobile responsive", "Analytics"],
      techStack: ["React", "Node.js", "PostgreSQL"],
      timeline: project.estimatedTimeline ?? "4-6 weeks",
      pricing: `$${project.estimatedCost ?? 5000}`,
      termsAndConditions: "Payment: 50% upfront, 50% on delivery. Revisions: 2 rounds included.",
    };
    try {
      const cleaned = proposalRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      proposalData = JSON.parse(cleaned);
    } catch { /* use default */ }

    const filesGenerated = ["index.html", "proposal.json", "README.md"];

    await db.update(projectsTable).set({
      generatedCode,
      generatedProposal: JSON.stringify(proposalData),
      codeGenerated: true,
      proposalGenerated: true,
      status: "Generated",
    }).where(eq(projectsTable.id, id));

    await db.insert(activityTable).values({ type: "project_generated", description: `MVP generated for "${project.name}"`, entityId: String(id), entityType: "project" });

    res.json({ projectId: id, filesGenerated, message: "MVP code and proposal generated successfully", codePreview: generatedCode.slice(0, 500) });
  } catch (err) {
    req.log.error({ err }, "generate project failed");
    res.status(500).json({ error: "Code generation failed" });
  }
});

router.post("/projects/:id/push-github", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }

    const token = process.env.GITHUB_TOKEN;
    if (!token) { res.status(400).json({ error: "GITHUB_TOKEN not configured", success: false, message: "No GitHub token" }); return; }

    const octokit = new Octokit({ auth: token });

    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    const repoName = project.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50);

    // Create repo
    let repoUrl = "";
    try {
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: project.description ?? `MVP for ${project.name}`,
        private: false,
        auto_init: true,
      });
      repoUrl = repo.html_url;

      // Push generated code if available
      if (project.generatedCode) {
        await new Promise((r) => setTimeout(r, 2000)); // Wait for init
        const { data: ref } = await octokit.git.getRef({ owner: user.login, repo: repoName, ref: "heads/main" });
        const sha = ref.object.sha;
        const { data: commit } = await octokit.git.getCommit({ owner: user.login, repo: repoName, commit_sha: sha });

        const { data: blob } = await octokit.git.createBlob({ owner: user.login, repo: repoName, content: project.generatedCode, encoding: "utf-8" });

        const files = [
          { path: "index.html", sha: blob.sha, mode: "100644" as const, type: "blob" as const },
        ];

        if (project.generatedProposal) {
          const { data: propBlob } = await octokit.git.createBlob({ owner: user.login, repo: repoName, content: project.generatedProposal, encoding: "utf-8" });
          files.push({ path: "proposal.json", sha: propBlob.sha, mode: "100644" as const, type: "blob" as const });
        }

        const readme = `# ${project.name}\n\n${project.description ?? ""}\n\n## Tech Stack\n${project.techStack ?? ""}\n\n## Generated by LaunchPad AI`;
        const { data: readmeBlob } = await octokit.git.createBlob({ owner: user.login, repo: repoName, content: readme, encoding: "utf-8" });
        files.push({ path: "README.md", sha: readmeBlob.sha, mode: "100644" as const, type: "blob" as const });

        const { data: tree } = await octokit.git.createTree({ owner: user.login, repo: repoName, tree: files, base_tree: commit.tree.sha });
        const { data: newCommit } = await octokit.git.createCommit({ owner: user.login, repo: repoName, message: "Initial MVP — generated by LaunchPad AI", tree: tree.sha, parents: [sha] });
        await octokit.git.updateRef({ owner: user.login, repo: repoName, ref: "heads/main", sha: newCommit.sha });
      }
    } catch (ghErr: unknown) {
      const msg = ghErr instanceof Error ? ghErr.message : String(ghErr);
      if (msg.includes("already exists")) {
        repoUrl = `https://github.com/${user.login}/${repoName}`;
      } else {
        throw ghErr;
      }
    }

    await db.update(projectsTable).set({ githubUrl: repoUrl, status: "Pushed" }).where(eq(projectsTable.id, id));
    await db.insert(activityTable).values({ type: "project_generated", description: `"${project.name}" pushed to GitHub`, entityId: String(id), entityType: "project" });

    res.json({ success: true, message: `Pushed to GitHub successfully`, repositoryUrl: repoUrl });
  } catch (err) {
    req.log.error({ err }, "push to github failed");
    res.status(500).json({ success: false, message: "GitHub push failed", repositoryUrl: null });
  }
});

router.get("/projects/:id/proposal", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    if (!project.generatedProposal) { res.status(404).json({ error: "No proposal generated yet" }); return; }

    let proposal: Record<string, unknown> = {};
    try { proposal = JSON.parse(project.generatedProposal); } catch { proposal = { raw: project.generatedProposal }; }

    res.json({ projectId: id, projectName: project.name, ...proposal });
  } catch (err) {
    req.log.error({ err }, "get proposal failed");
    res.status(500).json({ error: "Failed to get proposal" });
  }
});

export default router;
