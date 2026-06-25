import { useParams, useLocation } from "wouter";
import { useGetCampaign, getGetCampaignQueryKey, useSendCampaign } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Users, MailOpen, CornerUpLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CampaignDetail() {
  const { id } = useParams();
  const campaignId = Number(id);
  const { toast } = useToast();
  
  const { data: campaign, isLoading } = useGetCampaign(campaignId, {
    query: { enabled: !!campaignId, queryKey: getGetCampaignQueryKey(campaignId) }
  });

  const sendMutation = useSendCampaign();

  const handleSend = () => {
    sendMutation.mutate({
      data: { campaignId }
    }, {
      onSuccess: (res) => {
        toast({ title: "Campaign sending started", description: res.message });
      }
    });
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!campaign) {
    return <div className="p-8 text-center">Campaign not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant={campaign.status === 'Sent' ? 'default' : 'secondary'}>{campaign.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Campaign details and performance.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSend} disabled={sendMutation.isPending || campaign.status === 'Sent'}>
            <Send className="w-4 h-4 mr-2" /> Send Now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Recipients" value={campaign.recipientCount || 0} icon={Users} />
        <StatCard title="Sent" value={campaign.sentCount || 0} icon={Send} />
        <StatCard title="Opened" value={campaign.openCount || 0} icon={MailOpen} color="text-green-500" />
        <StatCard title="Replies" value={campaign.replyCount || 0} icon={CornerUpLeft} color="text-blue-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Content Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-card p-6 shadow-sm">
            <div className="border-b pb-4 mb-4">
              <div className="text-sm text-muted-foreground mb-1">Subject</div>
              <div className="font-medium text-lg">{campaign.subject || "No subject set"}</div>
            </div>
            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {campaign.body || "No body content set"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-muted-foreground" }: any) {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col justify-center">
        <div className="flex justify-between items-start">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <h3 className="text-2xl font-bold mt-2">{value}</h3>
      </CardContent>
    </Card>
  );
}
