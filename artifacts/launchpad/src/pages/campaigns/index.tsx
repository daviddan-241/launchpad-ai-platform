import { useGetCampaigns } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Campaigns() {
  const { data: campaigns, isLoading } = useGetCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage outbound email campaigns.</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-10">Loading campaigns...</div>
        ) : campaigns?.length ? (
          campaigns.map(c => (
            <Card key={c.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full text-primary">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">{c.subject || "No subject"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={c.status === 'Sent' ? 'default' : 'secondary'}>{c.status}</Badge>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 flex flex-col items-center text-center">
              <Mail className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-semibold">No campaigns yet</h3>
              <p className="text-muted-foreground max-w-sm mt-2 mb-4">Start reaching out to your leads automatically.</p>
              <Button><Plus className="w-4 h-4 mr-2" /> Create Campaign</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
