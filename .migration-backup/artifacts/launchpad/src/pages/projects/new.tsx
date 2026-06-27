import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateProject } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Zap, Loader2 } from "lucide-react";

const STACK_PRESETS = [
  "React + Node.js + PostgreSQL",
  "Next.js + Prisma + PostgreSQL",
  "Vue.js + Express + MongoDB",
  "React Native + Expo + Supabase",
  "Python + FastAPI + PostgreSQL",
];

export default function ProjectNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const createProject = useCreateProject();

  const handleSave = () => {
    if (!name.trim()) return;
    createProject.mutate({
      data: { name: name.trim(), description: description.trim(), techStack: techStack.trim(), targetAudience: targetAudience.trim() }
    }, {
      onSuccess: (res: any) => {
        toast({ title: "Project created" });
        navigate(`/projects/${res.id}`);
      },
      onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
    });
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/projects")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">New MVP Project</h1>
        <p className="text-sm text-gray-500 mt-0.5">Describe your idea — AI will generate a proposal and push it to GitHub</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Project Name <span className="text-red-400">*</span></Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. AI Lead Scoring Tool"
            className="bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Description</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does this app do? Who is it for? What problem does it solve?"
            className="min-h-[100px] bg-gray-50 border-gray-200 focus:bg-white resize-none"
          />
        </div>

        {/* Tech stack */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Tech Stack</Label>
          <Input
            value={techStack}
            onChange={e => setTechStack(e.target.value)}
            placeholder="e.g. React, Node.js, PostgreSQL"
            className="bg-gray-50 border-gray-200 focus:bg-white"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {STACK_PRESETS.map(s => (
              <button key={s} onClick={() => setTechStack(s)}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Target Audience</Label>
          <Input
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            placeholder="e.g. B2B SaaS founders, small e-commerce teams"
            className="bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button onClick={() => navigate("/projects")} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || createProject.isPending}
            className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-5 py-2 rounded-lg transition-colors"
          >
            {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
