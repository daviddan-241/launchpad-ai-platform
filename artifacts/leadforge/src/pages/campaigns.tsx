import { useState } from "react";
import { useGetCampaigns, getGetCampaignsQueryKey, useCreateCampaign, useSendCampaign } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Mail, Send, Clock, Loader2, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const campaignSchema = z.object({
  name: z.string().min(2),
  subject: z.string().min(2),
  body: z.string().min(10),
  fromName: z.string().min(2),
  fromEmail: z.string().email(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function Campaigns() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: campaigns, isLoading } = useGetCampaigns({
    query: { queryKey: getGetCampaignsQueryKey() }
  });
  
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();

  const addForm = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: "", subject: "", body: "", fromName: "", fromEmail: "" }
  });

  const onAddSubmit = (data: CampaignFormValues) => {
    createCampaign.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCampaignsQueryKey() });
        setIsAddOpen(false);
        addForm.reset();
        toast({ title: "Campaign created successfully" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to create campaign", description: (err as any).data?.error || err.message });
      }
    });
  };

  const handleSendCampaign = (id: number) => {
    sendCampaign.mutate({ id }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetCampaignsQueryKey() });
        toast({ title: "Campaign Sent", description: `Successfully sent to ${res.sent} leads.` });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to send", description: (err as any).data?.error || err.message });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "sent": return "bg-green-100 text-green-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign"><Plus className="w-4 h-4 mr-2" /> Create Campaign</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>New Email Campaign</DialogTitle>
              <DialogDescription>Create a new outbound email sequence.</DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Campaign Name</FormLabel><FormControl><Input placeholder="Q3 Outreach - Tech Startups" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addForm.control} name="fromName" render={({ field }) => (
                    <FormItem><FormLabel>From Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="fromEmail" render={({ field }) => (
                    <FormItem><FormLabel>From Email</FormLabel><FormControl><Input placeholder="john@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={addForm.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Email Subject</FormLabel><FormControl><Input placeholder="Quick question about {{company}}" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addForm.control} name="body" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body</FormLabel>
                    <FormControl><Textarea className="min-h-[150px]" placeholder="Hi {{first_name}}, ..." {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Available variables: {'{{name}}'}, {'{{first_name}}'}, {'{{company}}'}</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createCampaign.isPending}>
                    {createCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Campaign
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : campaigns?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="mb-2">No campaigns yet</CardTitle>
          <CardDescription className="mb-6 max-w-md">
            Create your first email campaign to start reaching out to your leads.
          </CardDescription>
          <Button onClick={() => setIsAddOpen(true)}>Create Campaign</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col hover-elevate transition-all border-border/50">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {format(new Date(campaign.createdAt), "MMM d")}
                  </span>
                </div>
                <CardTitle className="text-xl line-clamp-1">{campaign.name}</CardTitle>
                <CardDescription className="line-clamp-1">{campaign.subject}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/50">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{campaign.sentCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Sent</div>
                  </div>
                  <div className="text-center border-x border-border/50">
                    <div className="text-xl font-bold text-primary">{campaign.openCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Opens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{campaign.replyCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Replies</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex gap-2">
                {campaign.status === "draft" && (
                  <Button 
                    variant="default" 
                    className="flex-1" 
                    size="sm"
                    disabled={sendCampaign.isPending}
                    onClick={() => handleSendCampaign(campaign.id)}
                  >
                    {sendCampaign.isPending && sendCampaign.variables?.id === campaign.id ? (
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3 mr-2" />
                    )} 
                    Send
                  </Button>
                )}
                <Button variant="outline" className="flex-1" size="sm" asChild>
                  <Link href={`/campaigns`}><BarChart2 className="w-3 h-3 mr-2" /> Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
