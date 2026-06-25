import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Flame, Send, Zap, DollarSign, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: isActivityLoading } = useGetRecentActivity();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your sales pipeline and activity.</p>
      </div>

      {isStatsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Leads" value={stats?.totalLeads ?? 0} icon={Users} />
          <StatCard title="Hot Leads" value={stats?.hotLeads ?? 0} icon={Flame} color="text-orange-500" />
          <StatCard title="Campaigns Sent" value={stats?.campaignsSent ?? 0} icon={Send} color="text-blue-500" />
          <StatCard title="Open Rate" value={`${stats?.openRate ?? 0}%`} icon={Activity} color="text-green-500" />
          <StatCard title="Projects Generated" value={stats?.projectsGenerated ?? 0} icon={Zap} color="text-yellow-500" />
          <StatCard title="Revenue Est." value={`$${(stats?.revenueEstimate ?? 0).toLocaleString()}`} icon={DollarSign} color="text-primary" />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {activity?.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {!activity?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-muted-foreground" }: any) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-2">{value}</h3>
        </div>
        <div className={`p-3 rounded-full bg-secondary ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}
