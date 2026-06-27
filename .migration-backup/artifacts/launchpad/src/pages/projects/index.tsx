import { Link, useLocation } from "wouter";
import { useGetProjects } from "@workspace/api-client-react";
import { Plus, Zap, Github, ExternalLink, ChevronRight, Clock, CheckCircle2, Circle } from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  Ideating:  { bg: "bg-blue-50",   text: "text-blue-600",  icon: Circle },
  Generated: { bg: "bg-green-50",  text: "text-green-600", icon: CheckCircle2 },
  Pushed:    { bg: "bg-purple-50", text: "text-purple-600", icon: Github },
  Draft:     { bg: "bg-gray-50",   text: "text-gray-500",  icon: Clock },
};

export default function Projects() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = useGetProjects();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">AI-generated MVPs and proposals</p>
        </div>
        <Link href="/projects/new">
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Generate MVP
          </button>
        </Link>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="pt-3 border-t border-gray-100 flex justify-between">
                <div className="h-5 bg-gray-100 rounded-full w-20" />
                <div className="h-6 bg-gray-100 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : !projects?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-gray-700">No projects yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Generate an AI MVP proposal for any lead in seconds</p>
          <Link href="/projects/new">
            <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Generate MVP
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p: any) => {
            const meta = STATUS_COLORS[p.status] ?? STATUS_COLORS.Draft;
            const Icon = meta.icon;
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 flex-1">{p.name}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.bg} ${meta.text} flex-shrink-0`}>
                    <Icon className="w-2.5 h-2.5" /> {p.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">{p.description || "No description"}</p>

                {/* Tech stack */}
                {p.techStack && (
                  <p className="text-xs text-indigo-500 font-medium truncate">{p.techStack}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {p.estimatedCost && (
                      <span className="text-xs text-gray-400">${Number(p.estimatedCost).toLocaleString()}</span>
                    )}
                  </div>
                  <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
