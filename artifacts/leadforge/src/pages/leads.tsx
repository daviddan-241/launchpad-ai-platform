import { useState } from "react";
import { useGetLeads, getGetLeadsQueryKey, useCreateLead, useSearchLeads, useImportLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Plus, Search, Filter, Loader2, Download, Building2, Globe, Briefcase } from "lucide-react";
import { format } from "date-fns";

const leadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
  title: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Find Leads Dialog state
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndustry, setFindIndustry] = useState("");
  const [findCountry, setFindCountry] = useState("");
  const [selectedLeadIndexes, setSelectedLeadIndexes] = useState<number[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const queryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    country: countryFilter !== "all" ? countryFilter : undefined,
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
        toast({ title: "Lead added successfully" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to add lead", description: (err as any).data?.error || err.message });
      }
    });
  };

  const handleSearchLeads = () => {
    if (!findQuery) return;
    searchLeads.mutate({
      data: {
        query: findQuery,
        industry: findIndustry || undefined,
        country: findCountry || undefined,
        limit: 10
      }
    }, {
      onSuccess: () => {
        setSelectedLeadIndexes([]);
      }
    });
  };

  const handleImportLeads = () => {
    if (!searchLeads.data?.leads || selectedLeadIndexes.length === 0) return;
    
    const leadsToImport = selectedLeadIndexes.map(idx => {
      const c = searchLeads.data.leads[idx];
      return {
        name: c.name,
        email: c.email || undefined,
        company: c.company || undefined,
        title: c.title || undefined,
        country: c.country || undefined,
        industry: c.industry || undefined,
        linkedinUrl: c.linkedinUrl || undefined,
        status: "new"
      };
    });

    importLeads.mutate({ data: { leads: leadsToImport } }, {
      onSuccess: (res) => {
        toast({ 
          title: "Import Complete", 
          description: `Imported ${res.imported} leads. Skipped ${res.skipped}.` 
        });
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
        setIsFindOpen(false);
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Import failed", description: (err as any).data?.error || err.message });
      }
    });
  };

  const toggleLeadSelection = (index: number) => {
    setSelectedLeadIndexes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
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
        <div className="flex gap-2">
          
          <Dialog open={isFindOpen} onOpenChange={setIsFindOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-find-leads">
                <Search className="w-4 h-4 mr-2" /> Find Leads
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Find Global Leads</DialogTitle>
                <DialogDescription>Search the Apollo/Hunter database for targeted prospects.</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-2">
                <div className="space-y-1 md:col-span-2">
                  <FormLabel>Search Query</FormLabel>
                  <Input placeholder="e.g. CTOs at AI startups" value={findQuery} onChange={e => setFindQuery(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <FormLabel>Industry (optional)</FormLabel>
                  <Input placeholder="Software" value={findIndustry} onChange={e => setFindIndustry(e.target.value)} />
                </div>
                <Button onClick={handleSearchLeads} disabled={searchLeads.isPending || !findQuery} className="w-full">
                  {searchLeads.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Search
                </Button>
              </div>

              <div className="flex-1 overflow-auto border rounded-md min-h-[300px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchLeads.isPending ? (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : !searchLeads.data ? (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">Enter a query and search to find leads.</TableCell></TableRow>
                    ) : searchLeads.data.leads.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">No prospects found. Try adjusting your query.</TableCell></TableRow>
                    ) : (
                      searchLeads.data.leads.map((candidate, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedLeadIndexes.includes(idx)}
                              onCheckedChange={() => toggleLeadSelection(idx)}
                            />
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
                          <TableCell>
                            <Badge variant="outline" className={candidate.confidence > 80 ? "text-green-600" : "text-yellow-600"}>
                              {candidate.confidence}% Match
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
                  <span className="text-sm text-muted-foreground">
                    {selectedLeadIndexes.length} leads selected
                  </span>
                  <Button onClick={handleImportLeads} disabled={selectedLeadIndexes.length === 0 || importLeads.isPending}>
                    {importLeads.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    Import Selected
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
                <DialogDescription>Manually add a new contact to your pipeline.</DialogDescription>
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
                      {createLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Lead
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
                <Input 
                  type="search" 
                  placeholder="Search leads..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-leads"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : leads?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No leads found.</TableCell></TableRow>
                ) : (
                  leads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell><Checkbox /></TableCell>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{lead.company || "-"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <Briefcase className="w-3 h-3" />
                          {lead.title || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                          {lead.country || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(lead.status)}>{lead.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(lead.createdAt), "MMM d, yyyy")}
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
