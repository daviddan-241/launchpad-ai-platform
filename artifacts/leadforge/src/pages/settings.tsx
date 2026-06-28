import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Key, Mail, Search, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const settingsSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().default(true),
  defaultFromName: z.string().optional(),
  defaultFromEmail: z.string().email().optional().or(z.literal("")),
  hunterApiKey: z.string().optional(),
  apolloApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  googleSearchApiKey: z.string().optional(),
  googleSearchCx: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });
  
  const updateSettings = useUpdateSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      smtpHost: "",
      smtpPort: 465,
      smtpUser: "",
      smtpPassword: "",
      smtpSecure: true,
      defaultFromName: "",
      defaultFromEmail: "",
      hunterApiKey: "",
      apolloApiKey: "",
      openaiApiKey: "",
      googleSearchApiKey: "",
      googleSearchCx: "",
    }
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (settings && !initializedRef.current) {
      form.reset({
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 465,
        smtpUser: settings.smtpUser || "",
        smtpPassword: "", // Never populate password
        smtpSecure: settings.smtpSecure ?? true,
        defaultFromName: settings.defaultFromName || "",
        defaultFromEmail: settings.defaultFromEmail || "",
        hunterApiKey: settings.hunterApiKey || "",
        apolloApiKey: settings.apolloApiKey || "",
        openaiApiKey: settings.openaiApiKey || "",
        googleSearchApiKey: settings.googleSearchApiKey || "",
        googleSearchCx: settings.googleSearchCx || "",
      });
      initializedRef.current = true;
    }
  }, [settings, form]);

  const onSubmit = (data: SettingsFormValues) => {
    // Strip masked values so we don't send "****" to API
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => typeof v !== 'string' || !v.includes('****'))
    );

    updateSettings.mutate({ data: cleanData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved", description: "Your configuration has been updated." });
        // Don't reset form completely to avoid flashing empty inputs
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to save settings", description: (err as any).data?.error || err.message });
      }
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Configure integrations and workspace preferences.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Email Configuration</CardTitle>
              <CardDescription>SMTP settings for sending outbound campaigns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="defaultFromName" render={({ field }) => (
                  <FormItem><FormLabel>Default From Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="defaultFromEmail" render={({ field }) => (
                  <FormItem><FormLabel>Default From Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="smtpHost" render={({ field }) => (
                  <FormItem><FormLabel>SMTP Host</FormLabel><FormControl><Input placeholder="smtp.gmail.com" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="smtpPort" render={({ field }) => (
                  <FormItem><FormLabel>SMTP Port</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="smtpUser" render={({ field }) => (
                  <FormItem><FormLabel>SMTP Username</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="smtpPassword" render={({ field }) => (
                  <FormItem><FormLabel>SMTP Password</FormLabel><FormControl><Input type="password" placeholder="Leave empty to keep existing" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="smtpSecure" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Use SSL/TLS</FormLabel>
                    <FormDescription>Enable secure connection for SMTP.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> API Keys & Integrations</CardTitle>
              <CardDescription>Connect external services for lead enrichment and AI features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="openaiApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" /> OpenAI API Key</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormDescription>Powers the AI chat assistant and email generation.</FormDescription>
                </FormItem>
              )} />
              <FormField control={form.control} name="apolloApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>Apollo.io API Key</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="hunterApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hunter.io API Key</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="googleSearchApiKey" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Search className="w-4 h-4 text-blue-500" /> Google Search API Key</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="googleSearchCx" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Custom Search Engine ID (CX)</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-settings">
              {updateSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
