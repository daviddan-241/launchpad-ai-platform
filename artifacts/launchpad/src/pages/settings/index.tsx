import { useGetEmailAccounts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Mail, Plus } from "lucide-react";

export default function Settings() {
  const { data: accounts, isLoading } = useGetEmailAccounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your integrations and platform settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Email Accounts</CardTitle>
          <CardDescription>Connect email accounts to send campaigns.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div>Loading accounts...</div>
          ) : accounts?.length ? (
            accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{acc.email}</p>
                  <p className="text-sm text-muted-foreground">Provider: {acc.provider}</p>
                </div>
                <Button variant="destructive" size="sm">Disconnect</Button>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
              No email accounts connected.
            </div>
          )}
          <Button variant="outline" className="w-full mt-2"><Plus className="w-4 h-4 mr-2" /> Connect Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
