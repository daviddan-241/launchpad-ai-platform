import { useGetProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Projects() {
  const { data: projects, isLoading } = useGetProjects();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Generate AI MVPs and project proposals.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Generate MVP</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-10">Loading projects...</div>
        ) : projects?.length ? (
          projects.map(p => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-1">{p.name}</CardTitle>
                  <Badge>{p.status}</Badge>
                </div>
                <CardDescription className="line-clamp-2">{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t flex justify-between items-center">
                <div className="text-sm font-medium text-muted-foreground">
                  {p.codeGenerated ? "Code ready" : "Ideating"}
                </div>
                <Button variant="outline" size="sm">Details</Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 flex flex-col items-center text-center">
                <Zap className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-4">Generate code and proposals for your leads in seconds.</p>
                <Button><Plus className="w-4 h-4 mr-2" /> Generate MVP</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
