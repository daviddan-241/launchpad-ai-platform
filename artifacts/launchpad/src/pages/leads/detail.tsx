import { useParams } from "wouter";
import { useGetLead, getGetLeadQueryKey, useUpdateLead } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MapPin, Globe, Linkedin, MessageCircle, Clock, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDetail() {
  const { id } = useParams();
  const leadId = Number(id);

  const { data: lead, isLoading } = useGetLead(leadId, { 
    query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) } 
  });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!lead) {
    return <div className="p-8 text-center">Lead not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{lead.companyName}</h1>
            <Badge variant={lead.status === 'Hot' ? 'destructive' : 'secondary'}>{lead.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> {lead.industry || "Unknown Industry"}
          </p>
        </div>
        <div className="flex gap-2">
          {lead.whatsappNumber && (
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(`https://wa.me/${lead.whatsappNumber}`, '_blank')}>
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
          )}
          <Button variant="outline"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Contact Name</Label>
                <div className="font-medium">{lead.contactName || "—"}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <div className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" /> {lead.email || "—"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Phone</Label>
                <div className="font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" /> {lead.phone || "—"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Location</Label>
                <div className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> {lead.location || "—"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Website</Label>
                <div className="font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" /> {lead.website || "—"}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">LinkedIn</Label>
                <div className="font-medium flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-muted-foreground" /> {lead.linkedinUrl || "—"}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t mt-4">
              <Label className="text-muted-foreground text-xs">Notes</Label>
              <div className="mt-1 text-sm whitespace-pre-wrap">
                {lead.notes || "No notes available."}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="text-5xl font-black text-primary">{lead.score || 0}</div>
              <p className="text-sm text-muted-foreground mt-2">out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="bg-secondary p-2 rounded-full"><Clock className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-medium">Lead Created</p>
                  <p className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}
