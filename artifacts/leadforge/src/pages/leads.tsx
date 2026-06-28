import { useState } from "react";
import { useGetLeads, getGetLeadsQueryKey, useCreateLead, useSearchLeads, useImportLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2, Download, Building2, Globe, Briefcase, Sparkles, Star } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

const leadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
  title: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-500";
  const stars = score >= 70 ? 3 : score >= 40 ? 2 : 1;
  return (
    <div className={`flex items-center gap-1 ${color} font-medium text-xs`}>
      {Array.from({ length: stars }).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
      <span>{score}</span>
    </div>
  );
}

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndustry, setFindIndustry] = useState("");
  const [findCountry, setFindCountry] = useState("");
  const [findTitle, setFindTitle] = useState("");
  const [selectedLeadIndexes, setSelectedLeadIndexes] = useState<number[]>([]);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [scoringAll, setScoringAll] = useState(false);
  const { token } = useAuth();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  };

  const { data: leads, isLoading } = useGetLeads(queryParams, {
    query: { queryKey: getGetLeadsQueryKey(queryParams) }
  });

  const createLead = useCreateLead();
  const searchLeads = useSearchLeads();
  const importLeads = useImportLeads();

  const addForm = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", email: "", company: "", title: "", country: "", industry: "" }
  });

  const onAddSubmit = (data: LeadFormValues) => {
    createLead.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
        setIsAddOpen(false);
        addForm.reset();
        toast({ title: "Lead added & scored" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to add lead", description: (err as any).data?.error || err.message });
      }
    });
  };

  const handleSearchLeads = () => {
    if (!findQuery) return;
    searchLeads.mutate({
      data: { query: findQuery, industry: findIndustry || undefined, country: findCountry || undefined, title: findTitle || undefined, limit: 10 }
    }, { onSuccess: () => setSelectedLeadIndexes([]) });
  };

  const handleImportLeads = () => {
    if (!searchLeads.data?.leads || selectedLeadIndexes.length === 0) return;
    const leadsToImport = selectedLeadIndexes.map(idx => {
      const c = searchLeads.data.leads[idx];
      return { name: c.name, email: c.email || undefined, company: c.company || undefined, title: c.title || undefined, country: c.country || undefined, industry: c.industry || undefined, linkedinUrl: c.linkedinUrl || undefined, status: "new" };
    });
    importLeads.mutate({ data: { leads: leadsToImport } }, {
      onSuccess: (res) => {
        toast({ title: "Import Complete", description: `Imported ${res.imported} leads with auto-scoring.` });
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
        setIsFindOpen(false);
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Import failed", description: (err as any).data?.error || err.message });
      }
    });
  };

  const handleEnrichLead = async (leadId: number) => {
    setEnrichingId(leadId);
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/leads/${leadId}/enrich`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrich failed");
      toast({ title: "Lead enriched!", description: `Score updated to ${data.score}. ${data.enriched} fields filled.` });
      queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
    } catch (e) {
      toast({ variant: "destructive", title: "Enrich failed", description: (e as Error).message });
    } finally {
      setEnrichingId(null);
    }
  };

  const handleScoreAll = async () => {
    setScoringAll(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/leads/score-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      toast({ title: "All leads scored!", description: `Updated ${data.updated} of ${data.total} leads.` });
      queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
    } catch (e) {
      toast({ variant: "destructive", title: "Scoring failed", description: (e as Error).message });
    } finally {
      setScoringAll(false);
    }
  };

  const toggleLeadSelection = (index: number) => {
    setSelectedLeadIndexes(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "contacted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "qualified": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "unqualified": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "converted": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleScoreAll} disabled={scoringAll}>
            {scoringAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Score All
          </Button>

          <Dialog open={isFindOpen} onOpenChange={setIsFindOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-find-leads">
                <Search className="w-4 h-4 mr-2" /> Find Leads
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Find Global Leads</DialogTitle>
                <DialogDescription>Search the Apollo.io / Hunter.io database for targeted prospects worldwide.</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-2">
                <div className="space-y-1 md:col-span-2">
                  <FormLabel>Company / Domain / Keywords</FormLabel>
                  <Input placeholder="e.g. Stripe, SaaS startups, fintech" value={findQuery} onChange={e => setFindQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearchLeads()} />
                </div>
                <div className="space-y-1">
                  <FormLabel>Industry</FormLabel>
                  <Input placeholder="SaaS, FinTech…" value={findIndustry} onChange={e => setFindIndustry(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <FormLabel>Country</FormLabel>
                  <Input placeholder="USA, China, UK…" value={findCountry} onChange={e => setFindCountry(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 items-end mb-2">
                <div className="space-y-1 flex-1 max-w-xs">
                  <FormLabel>Job Title</FormLabel>
                  <Input placeholder="CEO, VP Sales, CTO…" value={findTitle} onChange={e => setFindTitle(e.target.value)} />
                </div>
                <Button onClick={handleSearchLeads} disabled={searchLeads.isPending || !findQuery}>
                  {searchLeads.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Search
                </Button>
                {searchLeads.data && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLeadIndexes(searchLeads.data.leads.map((_, i) => i))}>
                    Select All
                  </Button>
                )}
              </div>

              {searchLeads.data && (
                <div className="flex items-center gap-2 text-xs mb-1">
                  <Badge variant={searchLeads.data.source === "live_api" ? "default" : "outline"}>
                    {searchLeads.data.source === "live_api" ? "🟢 Live API" : "🟡 Demo data"}
                  </Badge>
                  <span className="text-muted-foreground">{searchLeads.data.source === "demo" ? "Add API keys in Settings to get real contacts" : `${searchLeads.data.total} results from Hunter.io / Apollo.io`}</span>
                </div>
              )}

              <div className="flex-1 overflow-auto border rounded-md min-h-[280px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchLeads.isPending ? (
                      <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : !searchLeads.data ? (
                      <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground">Enter a query and hit Search to find prospects.</TableCell></TableRow>
                    ) : searchLeads.data.leads.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground">No prospects found. Try adjusting your query.</TableCell></TableRow>
                    ) : (
                      searchLeads.data.leads.map((candidate, idx) => (
                        <TableRow key={idx} className={selectedLeadIndexes.includes(idx) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox checked={selectedLeadIndexes.includes(idx)} onCheckedChange={() => toggleLeadSelection(idx)} />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{candidate.name}</div>
                            <div className="text-xs text-muted-foreground">{candidate.email || "No email"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{candidate.company || "-"}</div>
                            <div className="text-xs text-muted-foreground">{candidate.title || "-"}</div>
                          </TableCell>
                          <TableCell className="text-sm">{candidate.country || "-"}</TableCell>
                          <TableCell><ScoreBadge score={(candidate as any).score ?? null} /></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={candidate.confidence > 80 ? "text-green-600" : "text-yellow-600"}>
                              {candidate.confidence}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter className="pt-4 border-t mt-4">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-muted-foreground">{selectedLeadIndexes.length} leads selected</span>
                  <Button onClick={handleImportLeads} disabled={selectedLeadIndexes.length === 0 || importLeads.isPending}>
                    {importLeads.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    Import & Auto-Score
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lead"><Plus className="w-4 h-4 mr-2" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>Manually add a contact — score is calculated automatically.</DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <FormField control={addForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={addForm.control} name="company" render={({ field }) => (
                      <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={addForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={addForm.control} name="country" render={({ field }) => (
                      <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={addForm.control} name="industry" render={({ field }) => (
                      <FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createLead.isPending}>
                      {createLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save & Score Lead
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center flex-1 w-full gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search leads…" className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-leads" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="unqualified">Unqualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"><Checkbox /></TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : leads?.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No leads yet — click <strong>Find Leads</strong> to discover global prospects.</TableCell></TableRow>
                ) : (
                  leads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell><Checkbox /></TableCell>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email || "No email"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-sm">{lead.company || "-"}</span></div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground"><Briefcase className="w-3 h-3" />{lead.title || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm"><Globe className="w-3.5 h-3.5 text-muted-foreground" />{lead.country || "-"}</div>
                      </TableCell>
                      <TableCell><ScoreBadge score={lead.score ?? null} /></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(lead.status)}>{lead.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEnrichLead(lead.id)} disabled={enrichingId === lead.id} title="Enrich via Hunter.io / Apollo.io">
                          {enrichingId === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(lead.createdAt), "MMM d")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
