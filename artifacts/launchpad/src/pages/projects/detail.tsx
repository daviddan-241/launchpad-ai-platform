import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { useGetProject, getGetProjectQueryKey, useGenerateProjectCode, useGetProjectProposal, usePushProjectToGithub, useDeleteProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Wand2, Github, ExternalLink, FileText, Code2, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  Ideating: "bg-blue-100 text-blue-700 border-blue-200",
  Generated: "bg-green-100 text-green-700 border-green-200",
  Pushed: "bg-purple-100 text-purple-700 border-purple-200",
  Draft: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"proposal" | "code">("proposal");

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: proposal } = useGetProjectProposal(projectId, {
    query: { enabled: !!(project as any)?.proposalGenerated },
  });

  const generateMutation = useGenerateProjectCode();
  const githubMutation = usePushProjectToGithub();
  const deleteMutation = useDeleteProject();

  const handleGenerate = () => {
    generateMutation.mutate({ data: { projectId } } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Generation complete", description: "Proposal and code scaffold created." });
      },
      onError: () => toast({ title: "Generation failed", variant: "destructive" }),
    });
  };

  const handleGithub = () => {
    githubMutation.mutate({ data: { projectId } } as any, {
      onSuccess: (res: any) => {
        qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Pushed to GitHub", description: res.githubUrl });
      },
      onError: () => toast({ title: "GitHub push failed — check GITHUB_TOKEN", variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    deleteMutation.mutate({ id: projectId } as any, {
      onSuccess: () => { toast({ title: "Project deleted" }); navigate("/projects"); },
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse max-w-4xl space-y-4">
        <div className="h-6 bg-gray-100 rounded w-32" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="h-6 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found</p>
        <button onClick={() => navigate("/projects")} className="mt-3 text-indigo-600 text-sm hover:underline">← Back</button>
      </div>
    );
  }

  const p = project as any;
  const prop = proposal as any;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/projects")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={deleteMutation.isPending} className="flex items-center gap-1.5 text-sm text-red-500 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          {!p.codeGenerated && (
            <button onClick={handleGenerate} disabled={generateMutation.isPending} className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-1.5 rounded-lg transition-colors">
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Generate MVP
            </button>
          )}
          {p.codeGenerated && !p.githubUrl && (
            <button onClick={handleGithub} disabled={githubMutation.isPending} className="flex items-center gap-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-60 px-4 py-1.5 rounded-lg transition-colors">
              {githubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              Push to GitHub
            </button>
          )}
          {p.githubUrl && (
            <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 px-4 py-1.5 rounded-lg transition-colors">
              <ExternalLink className="w-4 h-4" /> View Repo
            </a>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">{p.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {p.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-2xl">{p.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-gray-100">
          {p.techStack && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Tech Stack</p>
              <p className="text-sm text-gray-700 mt-0.5 font-medium">{p.techStack}</p>
            </div>
          )}
          {p.targetAudience && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Audience</p>
              <p className="text-sm text-gray-700 mt-0.5">{p.targetAudience}</p>
            </div>
          )}
          {p.estimatedCost && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Est. Cost</p>
              <p className="text-sm text-gray-700 mt-0.5 font-medium">${Number(p.estimatedCost).toLocaleString()}</p>
            </div>
          )}
          {p.estimatedTimeline && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">Timeline</p>
              <p className="text-sm text-gray-700 mt-0.5">{p.estimatedTimeline}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Proposal / Code */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {(["proposal", "code"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === t ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "proposal" ? <FileText className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
              {t === "proposal" ? "Proposal" : "Code Output"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "proposal" ? (
            prop ? (
              <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                {prop.executiveSummary && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Executive Summary</h3>
                    <p className="text-sm leading-relaxed text-gray-600">{prop.executiveSummary}</p>
                  </div>
                )}
                {prop.features?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Key Features</h3>
                    <ul className="space-y-1">
                      {prop.features.map((f: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {prop.techStack?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Technology Stack</h3>
                    <p className="text-sm text-gray-600">{prop.techStack.join(", ")}</p>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  {prop.timeline && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Timeline</p>
                      <p className="text-sm font-medium text-gray-800">{prop.timeline}</p>
                    </div>
                  )}
                  {prop.pricing && (
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Pricing</p>
                      <p className="text-sm font-medium text-gray-800">{prop.pricing}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <Wand2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No proposal yet</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Click "Generate MVP" to create a full proposal with AI</p>
                {!p.codeGenerated && (
                  <button onClick={handleGenerate} disabled={generateMutation.isPending}
                    className="inline-flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg">
                    {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generate MVP
                  </button>
                )}
              </div>
            )
          ) : (
            p.codeGenerated && p.generatedCode ? (
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                {p.generatedCode}
              </pre>
            ) : (
              <div className="py-16 text-center">
                <Code2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No code output yet</p>
                <p className="text-xs text-gray-400 mt-1">Generate MVP to create the code scaffold</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
