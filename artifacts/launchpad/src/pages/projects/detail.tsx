import { useParams } from "wouter";
import { 
  useGetProject, 
  getGetProjectQueryKey, 
  useGenerateProjectCode,
  useGetProjectProposal,
  usePushProjectToGithub
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wand2, Github, ExternalLink, FileText, Code2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = Number(id);
  const { toast } = useToast();
  
  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: proposal } = useGetProjectProposal(projectId, {
    query: { enabled: !!project?.proposalGenerated }
  });

  const generateMutation = useGenerateProjectCode();
  const githubMutation = usePushProjectToGithub();

  const handleGenerate = () => {
    generateMutation.mutate({
      data: { projectId }
    }, {
      onSuccess: () => {
        toast({ title: "MVP Generation Started", description: "Code and proposal are being created." });
        // Assuming invalidate queries happens at the provider level or manually
      }
    });
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!project) {
    return <div className="p-8 text-center">Project not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant={project.status === 'Generated' ? 'default' : 'secondary'}>{project.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 max-w-2xl">{project.description}</p>
        </div>
        <div className="flex gap-2">
          {!project.codeGenerated && (
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              <Wand2 className="w-4 h-4 mr-2" /> Generate MVP
            </Button>
          )}
          {project.codeGenerated && !project.githubUrl && (
            <Button onClick={() => githubMutation.mutate({ data: { projectId } })} disabled={githubMutation.isPending} className="bg-neutral-900 hover:bg-neutral-800 text-white">
              <Github className="w-4 h-4 mr-2" /> Push to GitHub
            </Button>
          )}
          {project.githubUrl && (
            <Button variant="outline" onClick={() => window.open(project.githubUrl || '', '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" /> View Repository
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Tech Stack</div>
              <div className="font-medium">{project.techStack || "Not specified"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Target Audience</div>
              <div className="font-medium">{project.targetAudience || "Not specified"}</div>
            </div>
            {project.estimatedCost && (
              <div>
                <div className="text-xs text-muted-foreground">Estimated Cost</div>
                <div className="font-medium">${project.estimatedCost}</div>
              </div>
            )}
            {project.estimatedTimeline && (
              <div>
                <div className="text-xs text-muted-foreground">Timeline</div>
                <div className="font-medium">{project.estimatedTimeline}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <Tabs defaultValue="proposal">
              <TabsList className="mb-4">
                <TabsTrigger value="proposal"><FileText className="w-4 h-4 mr-2"/> Proposal</TabsTrigger>
                <TabsTrigger value="code"><Code2 className="w-4 h-4 mr-2"/> Code Output</TabsTrigger>
              </TabsList>
              
              <TabsContent value="proposal" className="space-y-4">
                {proposal ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <h3>Executive Summary</h3>
                    <p>{proposal.executiveSummary}</p>
                    
                    <h3>Features</h3>
                    <ul>
                      {proposal.features.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>

                    {proposal.techStack && (
                      <>
                        <h3>Technology Stack</h3>
                        <p>{proposal.techStack.join(", ")}</p>
                      </>
                    )}

                    <h3>Timeline & Pricing</h3>
                    <p>Timeline: {proposal.timeline}</p>
                    <p>Pricing: {proposal.pricing}</p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    Proposal has not been generated yet. Click "Generate MVP" to create it.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="code">
                {project.codeGenerated ? (
                  <div className="bg-neutral-900 rounded-md p-4 text-neutral-300 font-mono text-sm overflow-x-auto">
                    <div className="text-green-400 mb-2">// Scaffold generated successfully</div>
                    <pre>{`src/
  ├── components/
  │   ├── Layout.tsx
  │   └── Header.tsx
  ├── pages/
  │   ├── Home.tsx
  │   └── Dashboard.tsx
  ├── App.tsx
  └── main.tsx

package.json
vite.config.ts
tailwind.config.ts`}</pre>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    Code has not been generated yet. Click "Generate MVP" to create the scaffold.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
