import { useState } from "react";
import { useDiscoverLeads, useCreateLead } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, MapPin, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LeadDiscover() {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  
  const discoverMutation = useDiscoverLeads();
  const createLeadMutation = useCreateLead();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    discoverMutation.mutate({
      data: {
        query,
        industry: industry || undefined,
        location: location || undefined,
        limit: 10
      }
    });
  };

  const handleAddLead = (leadData: any) => {
    createLeadMutation.mutate({
      data: {
        companyName: leadData.companyName,
        industry: leadData.industry,
        location: leadData.location,
        website: leadData.website,
        source: "Discovery",
        status: "New"
      }
    }, {
      onSuccess: () => {
        toast({ title: "Lead added", description: `${leadData.companyName} added to your pipeline.` });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discover Leads</h1>
        <p className="text-muted-foreground mt-1">Find new companies to target.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label>Search Query</Label>
              <Input 
                placeholder="e.g. SaaS companies, marketing agencies..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry (Optional)</Label>
              <Input 
                placeholder="e.g. Technology" 
                value={industry}
                onChange={e => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Location (Optional)</Label>
              <Input 
                placeholder="e.g. San Francisco" 
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              disabled={discoverMutation.isPending || !query}
              className="md:col-span-4"
            >
              {discoverMutation.isPending ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Find Leads</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {discoverMutation.data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {discoverMutation.data.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No results found. Try broadening your search.
            </div>
          ) : (
            discoverMutation.data.map((lead: any, i: number) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{lead.companyName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div className="space-y-2 text-sm text-muted-foreground flex-1">
                    {lead.industry && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> {lead.industry}
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> {lead.location}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => handleAddLead(lead)}
                    disabled={createLeadMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add to Leads
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
