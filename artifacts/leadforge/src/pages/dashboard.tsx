import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, MousePointerClick, MessageSquare, TrendingUp, Globe, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Total Leads", value: stats?.totalLeads || 0, icon: Users, subtext: `+${stats?.leadsThisWeek || 0} this week` },
    { title: "Emails Sent", value: stats?.emailsSent || 0, icon: Mail, subtext: `${stats?.campaignsSent || 0} campaigns` },
    { title: "Open Rate", value: `${stats?.openRate || 0}%`, icon: MousePointerClick, subtext: "Average across campaigns" },
    { title: "AI Sessions", value: stats?.chatSessions || 0, icon: MessageSquare, subtext: "Active conversations" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`kpi-${kpi.title.replace(/\s+/g, '-').toLowerCase()}`}>
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Top Geographies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topCountries && stats.topCountries.length > 0 ? (
              <div className="space-y-4">
                {stats.topCountries.map((country) => (
                  <div key={country.country} className="flex items-center">
                    <div className="w-[120px] text-sm font-medium">{country.country}</div>
                    <div className="flex-1 ml-4">
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${(country.count / Math.max(...stats.topCountries.map(c => c.count))) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-[40px] text-right text-sm text-muted-foreground ml-4">{country.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No geography data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-6">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium leading-none">{activity.description}</p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
