import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateProject } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ProjectNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  
  const createProject = useCreateProject();

  const handleSave = () => {
    createProject.mutate({
      data: {
        name,
        description,
        techStack,
        targetAudience
      }
    }, {
      onSuccess: (res) => {
        toast({ title: "Project created" });
        setLocation(`/projects/${res.id}`);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New MVP Project</h1>
        <p className="text-muted-foreground mt-1">Define a project to generate code and proposals.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LeadGen Tool" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="What does this app do?"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Tech Stack</Label>
            <Input value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="e.g. React, Node.js, PostgreSQL" />
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. B2B Sales Teams" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setLocation("/projects")}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name || createProject.isPending}>Create Project</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
