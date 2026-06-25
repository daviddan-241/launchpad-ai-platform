import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateCampaign, useGetEmailAccounts, useGenerateCampaignCopy, useGetLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2 } from "lucide-react";

export default function CampaignNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailAccountId, setEmailAccountId] = useState("");
  
  const { data: accounts } = useGetEmailAccounts();
  const createCampaign = useCreateCampaign();
  const generateCopy = useGenerateCampaignCopy();

  const handleGenerateCopy = () => {
    generateCopy.mutate({
      data: {
        tone: "professional",
        goal: "Meeting scheduling",
        targetIndustry: "B2B"
      }
    }, {
      onSuccess: (res) => {
        setSubject(res.subject);
        setBody(res.body);
        toast({ title: "Copy generated!" });
      }
    });
  };

  const handleSave = () => {
    createCampaign.mutate({
      data: {
        name,
        subject,
        body,
        emailAccountId: emailAccountId ? Number(emailAccountId) : undefined,
      }
    }, {
      onSuccess: (res) => {
        toast({ title: "Campaign created" });
        setLocation(`/campaigns/${res.id}`);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Campaign</h1>
        <p className="text-muted-foreground mt-1">Create an outreach sequence.</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q4 Outreach" />
          </div>

          <div className="space-y-2">
            <Label>Sender Account</Label>
            <Select value={emailAccountId} onValueChange={setEmailAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select email account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map(acc => (
                  <SelectItem key={acc.id} value={acc.id.toString()}>{acc.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-lg">Email Content</Label>
              <Button variant="outline" size="sm" onClick={handleGenerateCopy} disabled={generateCopy.isPending}>
                <Wand2 className="w-4 h-4 mr-2" /> AI Generate
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea 
                  value={body} 
                  onChange={e => setBody(e.target.value)} 
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setLocation("/campaigns")}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name || createCampaign.isPending}>Save Campaign</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
